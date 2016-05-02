function OkkChatReady(OkkChatApi) {

/***********************************************/
/* Example of Server API class with dispatcher */
/***********************************************/
    var IncomingSoundManager = objectAssign({}, {
        _audio: null,
        _mute: false,
        _hasError: false,
        mute: function(){
            this._mute = true;
        },
        unmute: function(){
            this._mute = false;
        },
        _onerror: function(){
            this._hasError = true;
        },
        hasError: function(){
            return this._hasError;
        },
        play: function(){
            var url = ChatConfig.INCOMING_MESSAGE_SOUND_PATH || null;
            if(!this._audio && url){
                this._audio = new Audio();
                this._audio.onerror = this._onerror;
                this._audio.src = url;
            }
            if(this._audio && !this.hasError() && !this._mute){
                this._audio.play();
            }
        }
    });


    var ServerAPI = objectAssign({}, {
        _loadQueue: {},
        _accessKey: null,
        _socket: null,
        _updateQueue: [],
        _firstConnection: true,
        _connectToSocket: function(){
            var self = this,
                opts = {
                    path: ChatConfig.SOCKET_IO_NS
                };

            if(this._accessKey){
                opts['extraHeaders'] = {'Authorization': this._accessKey};
            }

            var socket = io(ChatConfig.SOCKET_IO_URL, opts);

            socket.on('connect', function(){
                console.log('connected!!!');
                self._socket = socket;
                OkkChatApi.Actions.operatorStatusChanged('online');
                if(!ServerAPI._firstConnection){
                    ServerAPI.loadContacts();
                    ServerAPI.loadNewestMessagesForCurrentContact();
                }
                ServerAPI._firstConnection = false;
            });

            socket.on('disconnect', function(){
                console.log('disconnect!!!');
                ServerAPI._needUpdateClientsList = true;
                OkkChatApi.Actions.operatorStatusChanged('offline');
            });

            socket.on('incoming:message', function (response) {
                var message = JSON.parse(response);
                OkkChatApi.Actions.incomingMessage(message)
            });

            socket.on('operator:message', function (response) {
                var res = JSON.parse(response);
                var item = this._updateQueue.shift();
                OkkChatApi.Actions.updateMessageContent(item.to, item.tempMessageId, res);
            }.bind(this));

            socket.on('operator:message:history', function(data) {
                var response = JSON.parse(data);
                if(response.success) {
                    var operator = OkkChatApi.Stores.AuthStore.getOperator();
                    var unreadIds = OkkChatApi.Stores.MessageStore.addContactRawMessages(operator,
                                                                                         response.contact,
                                                                                         response.data);
                    OkkChatApi.Stores.MessageStore.emitUpdate();
                    OkkChatApi.Stores.ContactsStore.setLoadedState(response.contact);
                    OkkChatApi.Stores.ContactsStore.emitContactSelect();
                    ServerAPI.popQueue(response.contact);
                    var data = ServerAPI.getNormalizedUnreadIds(unreadIds);
                    if(data.messageIds.length) {
                        socket.emit('operator:read:messages', JSON.stringify(data));
                    }
                }
            });

            socket.on('client:status', function (data) {
                var client = JSON.parse(data);
                OkkChatApi.Actions.clientStatusChanged(client.id, client.username, client.status);
            });

            socket.on('client:new', function (response) {

            });

            socket.on('client:list', function (jsonResponse) {
                var response = JSON.parse(jsonResponse);
                if(response.success) {
                    OkkChatApi.Stores.ContactsStore.init(response.data);
                    OkkChatApi.Stores.ContactsStore.emitChange();
                    OkkChatApi.Stores.MessageStore.init(response.unread)
                }
            });
        },
        pushQueue: function(contactId){
            if(!this._loadQueue[contactId]){
                this._loadQueue[contactId] = true;
                return true;
            }
            return false;
        },
        popQueue: function(contactId){
            delete this._loadQueue[contactId];
        },
        authenticate: function () {
            fetch(ChatConfig.URL_TO_OPERATOR_AUTH, { credentials: 'include' })
            .then(function(response){
                return response.json();
            })
            .then(function(data){
                if(data.success) {
                    ServerAPI._accessKey = data.access_key;
                    setTimeout(function() {
                        var user = data.user;
                        var operator = {
                            id: user.id,
                            name: user.first_name,
                            nick: user.username,
                            status: 'online'
                        };
                        OkkChatApi.Actions.authSuccess(operator);
                        ServerAPI._connectToSocket();
                    }, 1000);
                }else{
                    setTimeout(function(){
                        OkkChatApi.Actions.authFail(data.message);
                    }, 1000);
                }
            })
            .catch(function(data){
                    setTimeout(function(){
                        OkkChatApi.Actions.authFail(data.message);
                    }, 1000);
            });
        },
        loadContacts: function () {
            this._socket.emit('client:list');
        },
        loadNewestMessagesForCurrentContact: function(){
            var searchRegex = /m_|temp_/i;
            var contact =  OkkChatApi.Stores.ContactsStore.getCurrentContact();
            if(contact) {
                var lastMsgId = OkkChatApi.Stores.MessageStore.getLastMessageId(contact.name);
                var normalizedMessageId = +((""+lastMsgId).replace(searchRegex, ''));
                if(lastMsgId) {
                    ServerAPI.loadNewestRawContactMessages(contact.name, normalizedMessageId);
                }
            }
        },
        loadRawContactMessages: function (contactId, firstMsgId) {
            var queryData = {mobile: contactId};
            if (firstMsgId){
                queryData['firstMessageId'] = firstMsgId;
            }

            this._socket.emit('operator:message:history', JSON.stringify(queryData));
        },
        loadNewestRawContactMessages: function (contactId, lastMsgId) {
            var queryData = {mobile: contactId};
            if (lastMsgId){
                queryData['lastMessageId'] = lastMsgId;
            }

            this._socket.emit('operator:newest:message:history', JSON.stringify(queryData), function(jsonData){
                var history = JSON.parse(jsonData);
                var data = history.data;
                var unreadIds = [];
                var operator = OkkChatApi.Stores.AuthStore.getOperator();
                for(var i=0, len=history.data.length; i<len; i++){
                    var message = history.data[i];
                    unreadIds.push(message.id);
                }
                OkkChatApi.Stores.MessageStore.addContactRawMessages(operator, history.contact, data, true);
                var data = ServerAPI.getNormalizedUnreadIds(unreadIds);
                if(data.messageIds.length) {
                    ServerAPI._socket.emit('operator:read:messages', JSON.stringify(data));
                }
                ServerAPI.popQueue(history.contact);
            });
        },
        sendMessageToServer: function(msg){
            this._updateQueue.push({to: msg.receiver, tempMessageId: msg.id });
            this._socket.emit('operator:message', JSON.stringify(msg))
        },
        getNormalizedUnreadIds: function(unreadIds){
            if(unreadIds && unreadIds.length){
                var unreadedMsgIds = [];
                for(var i=0; i<unreadIds.length; i++){
                    unreadedMsgIds.push(+unreadIds[i].replace(/(m_|temp_)/gi, ''))
                }
                return {messageIds:unreadedMsgIds};
            }
            return {messageIds:[]};
        }
    });

    ServerAPI.dispatchToken = OkkChatApi.Dispatcher.register(function (action) {
        switch (action.type) {
            case OkkChatApi.ActionTypes.NEW_OUT_MESSAGE:
                var msg = action.payload;
                var rawMessage = {
                    id: msg.id,
                    message: msg.contentType == OkkChatApi.MessageContentTypes.IMAGE ? msg.fullImage : msg.message,
                    sender: msg.sender,
                    receiver: msg.receiver,
                    contentType: msg.contentType,
                    messageType: msg.messageType,
                    date: OkkChatApi.CoreUtils.formatDate(msg.date),
                    endOfConversation: msg.endOfConversation,
                    operator: true
                };
                ServerAPI.sendMessageToServer(rawMessage);
                break;
            case OkkChatApi.ActionTypes.API_FETCH_CONTACTS:
                ServerAPI.loadContacts();
                break;
            case OkkChatApi.ActionTypes.API_AUTH_OPERATOR:
                ServerAPI.authenticate(action.credentials);
                break;
            case OkkChatApi.ActionTypes.API_FETCH_CONTACT_HISTORY:
                var contactId = action.contact.name;
                var added = ServerAPI.pushQueue(contactId);
                if(added) {
                    ServerAPI.loadRawContactMessages(contactId, action.firstMessageId);
                }
                break;
            case OkkChatApi.ActionTypes.API_FETCH_NEWEST_CONTACT_HISTORY:
                var contactId = action.contact.name;
                var added = ServerAPI.pushQueue(contactId);
                if(added) {
                    ServerAPI.loadNewestRawContactMessages(contactId, action.lastMessageId);
                }
                break;
            case OkkChatApi.ActionTypes.NEW_IN_MESSAGE:
                IncomingSoundManager.play();
                break;
            case OkkChatApi.ActionTypes.MUTE_NOTIFICATION_SOUND:
                IncomingSoundManager.mute();
                break;
            case OkkChatApi.ActionTypes.UNMUTE_NOTIFICATION_SOUND:
                IncomingSoundManager.unmute();
                break;
            default:
                break;
        }
    });
}