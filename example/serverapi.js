function OkkChatReady(OkkChatApi) {

/***********************************************/
/* Example of Server API class with dispatcher */
/***********************************************/

    var ServerAPI = objectAssign({}, {
        _loadQueue: {},
        _accessKey: null,
        _socket: null,
        _updateQueue: [],
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
            });

            socket.on('disconnect', function(){
                console.log('disconnect!!!');
                OkkChatApi.Actions.operatorStatusChanged('offline');
            });

            socket.on('incoming:message', function (response) {
                var message = JSON.parse(response);
                OkkChatApi.Actions.incomingMessage(message)
            });

            socket.on('operator:message', function (response) {
                var res = JSON.parse(response);
                console.log("operator:message response", res.id, res.success);
                var item = this._updateQueue.shift();
                OkkChatApi.Actions.updateMessageContent(item.to, item.tempMessageId, res);
            }.bind(this));

            socket.on('operator:message:history', function(data) {
                var response = JSON.parse(data);
                if(response.success) {
                    var operator = OkkChatApi.Stores.AuthStore.getOperator();
                    OkkChatApi.Stores.MessageStore.addContactRawMessages(operator, response.contact, response.data);
                    OkkChatApi.Stores.MessageStore.emitUpdate();
                    OkkChatApi.Stores.ContactsStore.setLoadedState(response.contact);
                    OkkChatApi.Stores.ContactsStore.emitContactSelect();
                    ServerAPI.popQueue(response.contact);
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
        loadRawContactMessages: function (contactId, firstMsgId) {
            var queryData = {mobile: contactId};
            if (firstMsgId){
                queryData['firstMessageId'] = firstMsgId;
            }

            this._socket.emit('operator:message:history', JSON.stringify(queryData));
        },
        sendMessageToServer: function(msg){
            this._updateQueue.push({to: msg.receiver, tempMessageId: msg.id });
            this._socket.emit('operator:message', JSON.stringify(msg))
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
            default:
                break;
        }
    });
}