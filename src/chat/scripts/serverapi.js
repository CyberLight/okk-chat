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
                OkkChatApi.Actions.operatorStatusChanged(OkkChatApi.ContactStatus.ONLINE);
                if(!ServerAPI._firstConnection){
                    ServerAPI.loadContacts(ServerAPI.loadNewestMessagesForCurrentContact);
                }
                ServerAPI._firstConnection = false;
            });

            socket.on('disconnect', function(){
                console.log('disconnect!!!');
                OkkChatApi.Actions.operatorStatusChanged(OkkChatApi.ContactStatus.OFFLINE);
                OkkChatApi.Stores.ContactsStore.makeAllOffline();
            });

            socket.on('incoming:message', function (response, sendAck) {
                var message = JSON.parse(response);
                if(typeof sendAck == 'function'){
                    var currentOperator = OkkChatApi.Stores.AuthStore.getOperator();
                    sendAck(JSON.stringify({id:+message.id, deliveredTo: currentOperator.nick}));
                }
                OkkChatApi.Actions.incomingMessage(message);
            });


            socket.on('client:status', function (data) {
                var client = JSON.parse(data);
                OkkChatApi.Actions.clientStatusChanged(client.id, client.username, client.status);
            });

            socket.on('client:new', function (response) {

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
                            status: OkkChatApi.ContactStatus.ONLINE
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
        loadContacts: function (cb) {
            this._socket.emit('client:list', {}, function (jsonResponse) {
                var response = JSON.parse(jsonResponse);
                if(response.success) {
                    OkkChatApi.Stores.ContactsStore.init(response.data);
                    OkkChatApi.Stores.ContactsStore.emitChange();
                    OkkChatApi.Stores.MessageStore.init(response.unread)
                }
                if(typeof cb == "function") {
                    cb();
                }
            });
        },

        loadNewestMessagesForCurrentContact: function(){
            var contact =  OkkChatApi.Stores.ContactsStore.getCurrentContact();
            var lastMsgId = null;
            if(contact) {
                var unsentMessages = OkkChatApi.Stores.MessageStore.getUnsentMessages(contact.name);
                if(unsentMessages && !unsentMessages.length) {
                    lastMsgId = OkkChatApi.Stores.MessageStore.getLastDeliveredMessageId(contact.name);
                    ServerAPI.loadNewestRawContactMessages(contact.name, lastMsgId);
                }else{
                    lastMsgId = OkkChatApi.Stores.MessageStore.getLastDeliveredMessageId(contact.name);
                    ServerAPI.loadNewestRawContactMessages(contact.name, lastMsgId);
                }
            }
        },

        checkUnreadMessages: function(unsentMessages, cb){
            if(unsentMessages && unsentMessages.length) {
                ServerAPI._socket.emit('operator:check:messages', JSON.stringify(unsentMessages), cb);
            }
        },

        sendReadEvent: function(unreadIds){
            var data = ServerAPI.getNormalizedUnreadIds(unreadIds);
            if(data.messageIds.length) {
                ServerAPI._socket.emit('operator:read:messages', JSON.stringify(data), function(data){});
            }
        },

        loadRawContactMessages: function (contactId, firstMsgId) {
            var queryData = {mobile: contactId};
            if (firstMsgId){
                queryData['firstMessageId'] = firstMsgId;
            }

            this._socket.emit('operator:message:history', JSON.stringify(queryData), function(data){
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
                    this.sendReadEvent(unreadIds);
                    OkkChatApi.Stores.MessageStore.clearUnreadMessages(response.contact);
                }
            }.bind(this));
        },
        loadNewestRawContactMessages: function (contactId, lastMsgId) {
            var queryData = {mobile: contactId};
            if (lastMsgId){
                queryData['lastMessageId'] = lastMsgId;
            }

            this._socket.emit('operator:newest:message:history', JSON.stringify(queryData), function(jsonData){
                var history = JSON.parse(jsonData);
                var unreadIds = [];
                if(!history.success) {
                    return;
                }
                var newMessages = [];
                var operator = OkkChatApi.Stores.AuthStore.getOperator();
                var historyData = history.data;
                for(var i=0, len=historyData.length; i<len; i++){
                    var message = historyData[i];
                    var updateFlag = OkkChatApi.Stores.MessageStore._updateExisted(contactId, message);
                    if(updateFlag == OkkChatApi.ChatMessageUpdateStatus.NOT_UPDATED){
                        unreadIds.push(message.id);
                        newMessages.push(message);
                    }
                    if(updateFlag == OkkChatApi.ChatMessageUpdateStatus.UPDATED_WITH_TEMP_ID) {
                        OkkChatApi.Stores.MessageStore._unregisterOutMessage(history.contact, message.tempId);
                    }
                }
                OkkChatApi.Stores.MessageStore.addContactRawMessages(operator, history.contact, newMessages, true);
                data = ServerAPI.getNormalizedUnreadIds(unreadIds);

                var unsentMessages = OkkChatApi.Stores.MessageStore.getUnsentMessages(history.contact);
                for(var mIndex=0, lenUnsent=unsentMessages.length; mIndex<lenUnsent; mIndex++) {
                    ServerAPI.sendMessageToServer(unsentMessages[mIndex]);
                }

                if(data.messageIds.length) {
                    ServerAPI._socket.emit('operator:read:messages', JSON.stringify(data), function(data){});
                }
                ServerAPI.popQueue(history.contact);
            });
        },
        sendMessageToServer: function(msg){
            this._socket.emit('operator:message', JSON.stringify(msg), function(response){
                 var res = JSON.parse(response);
                 OkkChatApi.Actions.updateMessageContent(this.receiver, res.temp_id, res);
            }.bind(msg));
        },
        getNormalizedUnreadIds: function(unreadIds){
            if(unreadIds && unreadIds.length){
                var unreadedMsgIds = [];
                for(var i=0; i<unreadIds.length; i++){
                    if(+unreadIds[i]!=0) {
                        unreadedMsgIds.push(+unreadIds[i].replace(/m_/gi, ''))
                    }
                }
                return {messageIds:unreadedMsgIds};
            }
            return {messageIds:[]};
        }
    });

    ServerAPI.dispatchToken = OkkChatApi.Dispatcher.register(function (action) {
        var contactId,
            added = false;
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
                contactId = action.contact.name;
                added = ServerAPI.pushQueue(contactId);
                if(added) {
                    ServerAPI.loadRawContactMessages(contactId, action.firstMessageId);
                }
                break;
            case OkkChatApi.ActionTypes.API_FETCH_NEWEST_CONTACT_HISTORY:
                contactId = action.contact.name;
                added = ServerAPI.pushQueue(contactId);
                if(added) {
                    ServerAPI.loadNewestRawContactMessages(contactId, action.lastMessageId);
                }
                break;
            case OkkChatApi.ActionTypes.NEW_IN_MESSAGE:
                IncomingSoundManager.play();
                var contact = OkkChatApi.Stores.ContactsStore.getCurrentContact();
                var msg = action.payload;
                if(contact && msg.sender == contact.name) {
                    ServerAPI.sendReadEvent([msg.id]);
                }
                break;
            case OkkChatApi.ActionTypes.MUTE_NOTIFICATION_SOUND:
                IncomingSoundManager.mute();
                break;
            case OkkChatApi.ActionTypes.UNMUTE_NOTIFICATION_SOUND:
                IncomingSoundManager.unmute();
                break;
            case OkkChatApi.ActionTypes.READ_MESSAGES:
                var unreadIds = OkkChatApi.Stores.UnreadMessageStore.getUnreadIds(action.contactId);
                ServerAPI.sendReadEvent(unreadIds);
                OkkChatApi.Stores.MessageStore.clearUnreadMessages(action.contactId);
                break;
            default:
                break;
        }
    });
}