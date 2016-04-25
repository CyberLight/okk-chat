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
                setTimeout(function(){
                    var contactId = action.contact.name;
                    var added = ServerAPI.pushQueue(contactId);
                    if(added) {
                        ServerAPI.loadRawContactMessages(contactId, action.firstMessageId);
                    }
                }, 3000);
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
var _lastMessageId = 1;
var _messages = {};
var _contacts = {};
var _fullMessageImages = {};
var _chatParticipants = {};

var _activeContactId,
    _preActiveContactId,
    _contactFilterPattern = '',
    _currentOperator;

var keyMirror = function(obj) {
    var ret = {};
    var key;
    if (!(obj instanceof Object && !Array.isArray(obj))) {
        throw new Error('keyMirror(...): Argument must be an object.');
    }
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            ret[key] = key;
        }
    }
    return ret;
};

var MessageContentTypes = {
    IMAGE: 'image',
    TEXT: 'text'
};

var MessageTypes = {
    INCOMING: 'in',
    OUTGOING: 'out'
};

var ChatConstants = keyMirror({
    MESSAGE_CHANGE_EVENT: null,
    CONTACT_SELECT_EVENT: null,
    MESSAGE_UPDATE_EVENT: null,
    CONTACTS_CHANGE_EVENT: null,
    FULL_IMAGES_CHANGE_EVENT: null,
    OPERATOR_CHANGED: null,
    PARTICIPANTS_CHANGED: null
});

var ActionTypes = keyMirror({
    CLICK_CONTACT: null,
    RECEIVE_RAW_MESSAGES: null,
    NEW_OUT_MESSAGE: null,
    NEW_IN_MESSAGE: null,
    READ_MESSAGES: null,
    CONTACT_MESSAGES_SCROLL: null,
    CONTACT_FILTER: null,
    CLEAR_SELECTED_CONTACT: null,
    AUTH_SUCCESS: null,
    AUTH_FAIL: null,
    PUT_FULL_IMAGE: null,
    API_FETCH_CONTACTS: null,
    API_AUTH_OPERATOR: null,
    API_FETCH_CONTACT_MESSAGES: null,
    API_FETCH_CONTACT_HISTORY: null,
    UPDATE_MESSAGE_CONTENT: null,
    CLIENT_STATUS_CHANGED: null,
    OPERATOR_STATUS_CHANGED: null,
    MUTE_NOTIFICATION_SOUND: null,
    UNMUTE_NOTIFICATION_SOUND: null
});

var AuthStatuses = {
    SUCCESS: 1,
    ERROR: 2
};

var KeyConstants = {
    ENTER_KEY: 13
};

function getRandomItem (arr) {
    var keys = Object.keys(arr);
    var count = keys.length;
    return arr[keys[Math.floor(Math.random() * count)]];
}


function genNumber(){
    if(!genNumber.prevValues){
        genNumber.prevValues = 0;
    }
    genNumber.prevValues++;
    return genNumber.prevValues + 100000;
}

/***********************************/
/*             UTILS               */
/***********************************/

var CoreUtils = {
    timeSince: function timeSince(time) {

        switch (typeof time) {
            case 'number':
                break;
            case 'string':
                time = +new Date(time);
                break;
            case 'object':
                if (time.constructor === Date) time = time.getTime();
                break;
            default:
                time = +new Date();
        }
        var time_formats = [
            [60, 'seconds', 1], // 60
            [120, '1 minute ago', '1 minute from now'], // 60*2
            [3600, 'minutes', 60], // 60*60, 60
            [7200, '1 hour ago', '1 hour from now'], // 60*60*2
            [86400, 'hours', 3600], // 60*60*24, 60*60
            [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
            [604800, 'days', 86400], // 60*60*24*7, 60*60*24
            [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
            [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
            [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
            [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
            [58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        var seconds = (+new Date() - time) / 1000,
            token = 'ago', list_choice = 1;

        if (Math.floor(seconds) == 0) {
            return 'Just now'
        }
        if (Math.floor(seconds) < 0) {
            seconds = Math.abs(seconds);
            token = 'from now';
            list_choice = 2;
        }
        var i = 0, format;
        while (format = time_formats[i++])
            if (seconds < format[0]) {
                if (typeof format[2] == 'string')
                    return format[list_choice];
                else
                    return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
            }
        return time;
    },
    padLeft: function(num, base,chr){
        var  len = (String(base || 10).length - String(num).length)+1;
        return len > 0? new Array(len).join(chr || '0')+num : num;
    },
    getCurrentTime: function (dt) {
        var resultDate = new Date(dt) || new Date();
        return resultDate.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
    },
    formatDate: function(d){
        var dt;
        if(typeof d == "string") {
            dt = new Date(d);
        }else if(typeof d == 'object' && d.constructor == Date ){
            dt = d;
        }else{
            dt = new Date();
        }
        return [
                dt.getFullYear(),
                CoreUtils.padLeft(dt.getMonth() + 1),
                CoreUtils.padLeft(dt.getDate())].join('-') +
            ' ' + [
                CoreUtils.padLeft(dt.getHours()),
                CoreUtils.padLeft(dt.getMinutes()),
                CoreUtils.padLeft(dt.getSeconds())
            ].join(':');
    },
    mapMessageFromRaw: function(raw, isRead, operatorName){
        if(operatorName){
            raw.messageType = raw.sender != operatorName
                ? MessageTypes.INCOMING
                : MessageTypes.OUTGOING;
        }

        if (!raw.receiver) {
            raw.receiver = raw.sender;
        }
        var strId = (""+raw.id);
        var id = strId.indexOf('m_') == 0 || strId.indexOf('temp_') == 0 ? raw.id : 'm_' + raw.id;

        var result = {
            id: id,
            from: raw.sender,
            fromName: raw.operator ? raw.operatorName : raw.sender,
            to: raw.receiver,
            message: raw.message,
            contentType: raw.contentType,
            messageType: raw.messageType,
            operator: raw.operator,
            date: raw.date,
            endOfConversation: raw.endOfConversation,
            fullImageUrl: raw.fullImageUrl,
            sending: raw.sending || false,
            isRead: !!isRead
        };

        return result;
    },

    scrollIntoViewNeeded: function(parent, node, centerIfNeeded){
        var changed = false;
        centerIfNeeded = arguments.length === 0 ? true : !!centerIfNeeded;
        var parentComputedStyle = window.getComputedStyle(parent, null),
            parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue('border-top-width')),
            parentBorderLeftWidth = parseInt(parentComputedStyle.getPropertyValue('border-left-width')),
            overTop = node.offsetTop - parent.offsetTop < parent.scrollTop,
            overBottom = (node.offsetTop - parent.offsetTop + node.clientHeight - parentBorderTopWidth) > (parent.scrollTop + parent.clientHeight),
            overLeft = node.offsetLeft - parent.offsetLeft < parent.scrollLeft,
            overRight = (node.offsetLeft - parent.offsetLeft + node.clientWidth - parentBorderLeftWidth) > (parent.scrollLeft + parent.clientWidth),
            alignWithTop = overTop && !overBottom;

        if ((overTop || overBottom) && centerIfNeeded) {
            parent.scrollTop = node.offsetTop - parent.offsetTop - parent.clientHeight / 2 - parentBorderTopWidth + node.clientHeight / 2;
        }

        if ((overLeft || overRight) && centerIfNeeded) {
            parent.scrollLeft = node.offsetLeft - parent.offsetLeft - parent.clientWidth / 2 - parentBorderLeftWidth + node.clientWidth / 2;
            changed = true;
        }

        if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
            node.scrollIntoView(alignWithTop);
            changed = true;
        }
        return changed;
    },
    getCoefficient: function(width, height, limit){
        var maxHW = Math.max(width, height);
        var coefficient = 1;
        if(maxHW > limit){
            coefficient = maxHW / limit;
        }
        return coefficient;
    },
    getThumbnailBase64: function(srcBase64, cb){
        var self = this;
        var canvas = document.createElement('canvas');
        var image = new Image();
        image.onload = function() {
            var imgWidth = image.width;
            var imgHeight = image.height;

            var coefficient = self.getCoefficient(imgWidth, imgHeight, 1280);
            canvas.width = imgWidth / coefficient;
            canvas.height = imgHeight / coefficient;

            var ctx = canvas.getContext("2d");
            ctx.drawImage(image,0,0,canvas.width, canvas.height);
            var fullB64string = canvas.toDataURL("image/png");

            coefficient = self.getCoefficient(imgWidth, imgHeight, 300);
            canvas.width = imgWidth / coefficient;
            canvas.height = imgHeight / coefficient;

            ctx.drawImage(image,0,0,canvas.width, canvas.height);
            var b64string = canvas.toDataURL("image/png");
            canvas = image = null;
            if(typeof cb == 'function') {
                cb(b64string, fullB64string);
            }
        };
        image.src = srcBase64;
    },
    downloadImage: function(fullBase64, title, nameOfFile){
        var img = document.createElement('img');
        img.src = fullBase64;

        var a = document.createElement('a');
        a.setAttribute("download", nameOfFile);
        a.setAttribute("href", fullBase64);
        a.appendChild(img);

        var w = open();
        w.document.title = title;
        w.document.body.appendChild(a);
    },
    downloadImageByUrl: function(url, title, nameOfFile){
        var img = document.createElement('img');
        img.src = url;

        var a = document.createElement('a');
        a.setAttribute("download", nameOfFile);
        a.setAttribute("href", url);
        a.appendChild(img);

        var w = open();
        w.document.title = title;
        w.document.body.appendChild(a);
    },
    asyncLoop: function(o){
        var i=-1,
            length = o.length;

        var loop = function(){
            i++;
            if(i==length){o.callback(); return;}
            o.run(loop, i);
        };
        loop();
    }
};


/***********************************/
/*             ACTIONS             */
/***********************************/

var ChatActions = {
    muteNotifications: function(){
        ChatDispatcher.dispatch({
            type: ActionTypes.MUTE_NOTIFICATION_SOUND,
            payload: {}
        });
    },
    unmuteNotifications: function(){
        ChatDispatcher.dispatch({
            type: ActionTypes.UNMUTE_NOTIFICATION_SOUND,
            payload: {}
        });
    },
    operatorStatusChanged: function(status){
        ChatDispatcher.dispatch({
            type: ActionTypes.OPERATOR_STATUS_CHANGED,
            payload: {
                status: status
            }
        });
    },
    clientStatusChanged: function(id, username, status){
        ChatDispatcher.dispatch({
            type: ActionTypes.CLIENT_STATUS_CHANGED,
            payload: {
                id: id,
                username: username,
                status: status
            }
        });
    },
    updateMessageContent: function(receiver, tempMessageId, data){
        ChatDispatcher.dispatch({
            type: ActionTypes.UPDATE_MESSAGE_CONTENT,
            payload: {
                receiver: receiver,
                tempMessageId: tempMessageId,
                data: data
            }
        });
    },
    outgoingMessage: function (data) {
        var id = data.id || 'm_' + (++_lastMessageId);
        ChatDispatcher.dispatch({
            type: ActionTypes.NEW_OUT_MESSAGE,
            payload:{
                id: id,
                message: data.message,
                sender: data.sender,
                operatorName: data.operatorName,
                receiver: data.receiver,
                contentType: data.contentType,
                messageType: data.messageType,
                date: data.date,
                fullImage: data.fullImage,
                sending: data.sending,
                endOfConversation: data.endOfConversation,
                operator: true
            }
        });
    },

    authSuccess: function (operator) {
        ChatDispatcher.dispatch({
            type: ActionTypes.AUTH_SUCCESS,
            operator: operator
        });
    },

    authFail: function (error) {
        ChatDispatcher.dispatch({
            type: ActionTypes.AUTH_FAIL,
            error: error
        });
    },

    incomingMessage: function (msg) {
        if(msg.contentType == MessageContentTypes.IMAGE){
            ChatDispatcher.dispatch({
                type: ActionTypes.NEW_IN_MESSAGE,
                payload: {
                    id: msg.id,
                    message: 'data:image/jpg;base64,' + msg.message,
                    sender: msg.sender,
                    receiver: msg.receiver,
                    contentType: msg.contentType,
                    messageType: msg.messageType || MessageTypes.INCOMING,
                    date: msg.date,
                    endOfConversation: msg.endOfConversation,
                    fullImage: null,
                    fullImageUrl: msg.fullImageUrl,
                    operator: msg.operator,
                    operatorName: msg.operatorName
                },
                operator: AuthStore.getOperator()
            });
        }else {
            ChatDispatcher.dispatch({
                type: ActionTypes.NEW_IN_MESSAGE,
                payload: {
                    id: msg.id,
                    message: msg.message,
                    sender: msg.sender,
                    receiver: msg.receiver,
                    contentType: msg.contentType,
                    messageType: msg.messageType || MessageTypes.INCOMING,
                    date: msg.date,
                    endOfConversation: msg.endOfConversation,
                    fullImage: null,
                    fullImageUrl: null,
                    operator: msg.operator,
                    operatorName: msg.operatorName
                },
                operator: AuthStore.getOperator()
            });
        }
    },

    readMessages: function (contactId) {
        ChatDispatcher.dispatch({
            type: ActionTypes.READ_MESSAGES,
            contactId: contactId,
            changed: _preActiveContactId != contactId
        });
    },

    clickContact: function (contactId) {
        ChatDispatcher.dispatch({
            type: ActionTypes.CLICK_CONTACT,
            prevContactId: _preActiveContactId,
            contactId: contactId,
            changed: _activeContactId != contactId
        });
    },

    clearSelected: function () {
        ChatDispatcher.dispatch({
            type: ActionTypes.CLEAR_SELECTED_CONTACT
        });
    },

    messagesScroll: function (contactId, scrollTopValue) {
        ChatDispatcher.dispatch({
            type: ActionTypes.CONTACT_MESSAGES_SCROLL,
            contactId: contactId,
            scrollTopValue: scrollTopValue
        });
    },
    contactFilter: function (pattern) {
        ChatDispatcher.dispatch({
            type: ActionTypes.CONTACT_FILTER,
            pattern: pattern
        });
    },
    fetchContacts: function () {
        ChatDispatcher.dispatch({
            type: ActionTypes.API_FETCH_CONTACTS
        });
    },
    authenticate: function (credentials) {
        ChatDispatcher.dispatch({
            type: ActionTypes.API_AUTH_OPERATOR,
            credentials: credentials
        });
    },
    putFullImage: function (messageId, imageData) {
        ChatDispatcher.dispatch({
            type: ActionTypes.PUT_FULL_IMAGE,
            messageId: messageId,
            imageData: imageData
        });
    },

    fetchContactHistory: function(contact, firstMessageId){
        var searchRegex = /m_|temp_/i;
        var normalizedMessageId = firstMessageId && +((""+firstMessageId).replace(searchRegex, ''));
        ChatDispatcher.dispatch({
           type: ActionTypes.API_FETCH_CONTACT_HISTORY,
           contact: contact,
           firstMessageId: normalizedMessageId
        });
    }
};



/**************************************************/
/*                  STORES                        */
/**************************************************/

var AuthStore = objectAssign({}, EventEmitter.prototype, {
    errors: [],

    _clearErrors: function(){
        this.errors = [];
    },

    _addError: function(error){
        this.errors.push(error);
    },

    getErrors: function(){
        return this.errors;
    },

    emitChange: function() {
        this.emit(ChatConstants.OPERATOR_CHANGED);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(ChatConstants.OPERATOR_CHANGED, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(ChatConstants.OPERATOR_CHANGED, callback);
    },

    setOperator: function(operatorData){
        _currentOperator = operatorData;
    },

    getOperator: function() {
        return _currentOperator;
    },

    getStatus: function(){
        return this.status;
    },

    setStatus: function(status){
        this.status = status;
    }
});


var ParticipantsStore = objectAssign({}, EventEmitter.prototype, {

    emitChange: function() {
        this.emit(ChatConstants.PARTICIPANTS_CHANGED);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(ChatConstants.PARTICIPANTS_CHANGED, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(ChatConstants.PARTICIPANTS_CHANGED, callback);
    },

    getParticipants: function(contactId){
        return Object.keys(_chatParticipants[contactId] || {});
    },

    addParticipant: function(msg){
        var added = false;
        var contactId = msg.receiver;
        var participantId = msg.sender;

        if(!_chatParticipants[contactId]){
            _chatParticipants[contactId] = {};
        }

        if(participantId != contactId) {
            _chatParticipants[contactId][participantId] = 1;
            added = true;
        }
        return added;
    }

});

var UnreadMessageStore = objectAssign({}, EventEmitter.prototype, {

    emitChange: function() {
        this.emit(ChatConstants.MESSAGE_CHANGE_EVENT);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(ChatConstants.MESSAGE_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(ChatConstants.MESSAGE_CHANGE_EVENT, callback);
    },

    _getUnreadMessageIds: function(id){
        return (_messages[id] && _messages[id].unreadIds) || [];
    },

    getCount: function(id) {
        var messages = this._getUnreadMessageIds(id);
        return messages.length;
    },

    getAll: function(){
        var allCount = 0;
        var keys = Object.keys(_messages);
        for(var key in keys){
            allCount += this.getCount(keys[key]);
        }
        return allCount;
    }
});

var MessageStore = objectAssign({}, EventEmitter.prototype, {
    getFirstMessageId: function(contact){
        var messages = _messages[contact].messages;
        if (!messages) return null;

        var keys = Object.keys(messages);
        if (!keys.length) return null;

        var firstKey = keys[0];
        return messages[firstKey].id || null;
    },
    getLastMessageId: function(contact){
        var messages = _messages[contact].messages;
        if (!messages) return null;

        var keys = Object.keys(messages);
        if (!keys.length) return null;

        var lastKey = keys[keys.length-1];
        return messages[lastKey].id || null;
    },
    addContactRawMessages: function(operator, contactId, rawMessages){ //AAA
        var historyMessages = {};

        for(var i in rawMessages) {
            var rawMessage = rawMessages[i];
            var isRead = true;

            if(rawMessage.contentType == MessageContentTypes.IMAGE){
                rawMessage.message = 'data:image/jpg;base64,' + rawMessage.message;
            }

            var message = CoreUtils.mapMessageFromRaw(
                rawMessage,
                isRead,
                operator.nick
            );

            historyMessages[message.id] = message;
        }

        MessageStore.addHistoryMessages(contactId, historyMessages);
        MessageStore.emitUpdate();
    },
    getAll: function(){
        return _messages;
    },
    getMessages: function(id){
        if(!id){
            return [];
        }

        if(!_messages[id]){
            _messages[id] = {
                messages: {},
                unreadIds: [],
                firstUnreadMsgId: null,
                init: false
            };
        }

        var result = [];
        var messages = _messages[id].messages;

        for(var msgId in messages){
            result.push(messages[msgId]);
        }

        return result;
    },

    addHistoryMessages: function(contactId, messagesHash){
        if(!_messages[contactId]){
            _messages[contactId] = {
                messages: messagesHash,
                unreadIds: [],
                firstUnreadMsgId: null
            }
        }else{
            _messages[contactId].messages = React.addons.update(
                messagesHash,
                {$merge: _messages[contactId].messages}
            );
        }
    },

    addMessage: function(contactId, message, activeId){
        message.isRead = (activeId == contactId);
        if(!_messages[contactId]){
            _messages[contactId] = {
                messages:{},
                unreadIds: [],
                firstUnreadMsgId: null
            }
        }
        if(!message.isRead){
            _messages[contactId].unreadIds.push(message.id);
            if(_messages[contactId].firstUnreadMsgId == null){
                _messages[contactId].firstUnreadMsgId = message.id;
            }
        }

        _messages[contactId].messages[message.id] = message;
    },

    emitChange: function() {
        this.emit(ChatConstants.MESSAGE_CHANGE_EVENT);
    },

    emitUpdate: function() {
        this.emit(ChatConstants.MESSAGE_UPDATE_EVENT);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(ChatConstants.MESSAGE_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(ChatConstants.MESSAGE_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeUpdateListener: function(callback) {
        this.removeListener(ChatConstants.MESSAGE_UPDATE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    addUpdateListener: function(callback) {
        this.on(ChatConstants.MESSAGE_UPDATE_EVENT, callback);
    },

    addOutMessage: function(data){
        _lastMessageId++;
        var message = {
            id: data.id,
            from: data.operator.nick,
            fromName: data.operator.name,
            to: data.contact.name,
            message: data.data.message,
            contentType: data.type,
            messageType: MessageTypes.OUTGOING,
            endOfConversation: data.endOfConversation,
            operator: true,
            date: data.date,
            isRead: true
        };
        _messages[data.contact.name].messages[message.id] = message;
        this.emitChange();
    },

    unmarkFirstRead: function(id){
        if(id) {
            var msgId = _messages[id].firstUnreadMsgId;
            if (msgId != null) {
                _messages[id].messages[msgId].firstUnread = false;
            }
        }
    },
    readMessages: function(id){
        var messages = _messages[id].messages;
        var unreadIds = _messages[id].unreadIds || (_messages[id].unreadIds = []);

        var firstUnreadMsgId = _messages[id].firstUnreadMsgId;
        if(firstUnreadMsgId){
            messages[firstUnreadMsgId].firstUnread = false;
        }
        var readed = unreadIds.length > 0;
        for(var i = 0, len = unreadIds.length; i < len; i++){
            var message = messages[unreadIds[i]];
            if(i == 0){
                message.firstUnread = true;
                _messages[id].firstUnreadMsgId = message.id;
            }
            message.isRead = true;
        }

        _messages[id].unreadIds = [];
        return readed;
    }
});

var ContactsStore = objectAssign({}, EventEmitter.prototype, {
    init: function(rawContacts){
        for(var i=0, len=rawContacts.length; i<len; i++){
            var rawContact = rawContacts[i];
            _contacts[rawContact.username] = {
                id: rawContact.id,
                name: rawContact.username,
                status: rawContact.status,
                loadStatus: 'init'
            };
        }
    },
    getCountAll: function(){
        return Object.keys(_contacts).length;
    },
    getAll: function(){
        var result = [];
        if(_contactFilterPattern) {
            _preActiveContactId = _activeContactId;
            _activeContactId = null;
            for (var id in _contacts) {
                var contact = _contacts[id];
                if (contact.name.indexOf(_contactFilterPattern) >= 0) {
                    result.push(contact);
                }
            }
        }else{
            for (var id in _contacts) {
                var contact = _contacts[id];
                result.push(contact);
            }
        }

        return result;
    },

    setFilter: function(pattern){
        this.clearContact();
        _contactFilterPattern = pattern;
    },

    clearContact: function(){
        _preActiveContactId = _activeContactId;
        _activeContactId = null;
    },

    emitChange: function() {
        this.emit(ChatConstants.CONTACTS_CHANGE_EVENT);
    },

    emitContactSelect: function() {
        this.emit(ChatConstants.CONTACT_SELECT_EVENT);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(ChatConstants.CONTACTS_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    addContactSelectListener: function(callback) {
        this.on(ChatConstants.CONTACT_SELECT_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(ChatConstants.CONTACTS_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeContactSelectListener: function(callback) {
        this.removeListener(ChatConstants.CONTACT_SELECT_EVENT, callback);
    },

    getActive: function(){
        return _activeContactId;
    },

    getCurrentContact: function(){
        return _contacts[_activeContactId];
    },
    setActive: function(id){
        var changed = _activeContactId != id;
        _preActiveContactId = _activeContactId;
        _activeContactId = id;
        if(!_preActiveContactId) {
            _preActiveContactId = _activeContactId;
        }
        var clicks = _contacts[_activeContactId].clicks;
        _contacts[_activeContactId].clicks = (clicks && ++clicks) || 1;
        return changed;
    },
    setLoadingState: function(contactId){
        _contacts[contactId].loadStatus = 'loading';
    },
    setLoadedState: function(contactId){
        _contacts[contactId].loadStatus = 'loaded';
    }
});

/*****************************************************/
/*                 DISPATCHERS                       */
/*****************************************************/

var ChatDispatcher = new Flux.Dispatcher();

AuthStore.dispatchToken = ChatDispatcher.register(function(action) {
    switch (action.type) {
        case ActionTypes.AUTH_SUCCESS:
            AuthStore.setStatus(AuthStatuses.SUCCESS);
            AuthStore.setOperator(action.operator);
            AuthStore.emitChange();
            break;
        case ActionTypes.AUTH_FAIL:
            AuthStore.setStatus(AuthStatuses.ERROR);
            AuthStore._clearErrors();
            AuthStore._addError(action.error);
            AuthStore.emitChange();
            break;
        case ActionTypes.OPERATOR_STATUS_CHANGED:
            _currentOperator.status = action.payload.status;
            AuthStore.emitChange();
            break;
        default:
            break;
    }
});

ParticipantsStore.dispatchToken = ChatDispatcher.register(function(action) {
    var added;
    switch (action.type) {
        case ActionTypes.NEW_IN_MESSAGE:
        case ActionTypes.NEW_OUT_MESSAGE:
            var msg = action.payload;
            added = ParticipantsStore.addParticipant(msg);
            if(added) {
                ParticipantsStore.emitChange();
            }
            break;

        default:
            break;
    }
});

ContactsStore.dispatchToken = ChatDispatcher.register(function(action) {
    ChatDispatcher.waitFor([
        AuthStore.dispatchToken
    ]);
    switch (action.type) {
        case ActionTypes.CLICK_CONTACT:
            var changed = ContactsStore.setActive(action.contactId);
            if(changed) {
                ContactsStore.emitContactSelect();
            }
            break;

        case ActionTypes.CONTACT_MESSAGES_SCROLL:
            _contacts[action.contactId].scrollTop = action.scrollTopValue;
            ContactsStore.emitChange();
            break;

        case ActionTypes.CONTACT_FILTER:
            ContactsStore.setFilter(action.pattern);
            ContactsStore.emitChange();
            break;

        case ActionTypes.CLEAR_SELECTED_CONTACT:
            ContactsStore.clearContact();
            break;

        case ActionTypes.API_FETCH_CONTACT_HISTORY:
            ContactsStore.setLoadingState(action.contact.name, 'loading');
            break;

        case ActionTypes.CLIENT_STATUS_CHANGED:
            var data = action.payload;
            var contact = _contacts[data.username];
            if(contact) {
                contact.status = data.status;
            } else {
                _contacts[data.username] = {
                    id: data.id,
                    name: data.username,
                    status: data.status,
                    loadStatus: 'init'
                };
            }
            ContactsStore.emitChange();
            break;

        default:
            break;
    }
});


MessageStore.dispatchToken = ChatDispatcher.register(function(action) {
    ChatDispatcher.waitFor([
        ContactsStore.dispatchToken
    ]);

    var message = null;
    var activeContactId;
    var unreadIndex = -1;

    switch(action.type) {
        case ActionTypes.CLICK_CONTACT:
            if(action.changed) {
                MessageStore.unmarkFirstRead(action.prevContactId);
                MessageStore.emitUpdate();
            }
            break;
        case ActionTypes.NEW_OUT_MESSAGE:
            var outMsg = action.payload;
            message = CoreUtils.mapMessageFromRaw(outMsg, true);
            var contactId = message.to;
            activeContactId = ContactsStore.getActive();

            MessageStore.addMessage(contactId, message, activeContactId);

            if(outMsg.receiver == activeContactId) {
                MessageStore.emitUpdate();
            }
            MessageStore.emitChange();
            break;
        case ActionTypes.NEW_IN_MESSAGE:
            var inMsg = action.payload;
            message = CoreUtils.mapMessageFromRaw(inMsg, false, action.operator.nick);
            activeContactId = ContactsStore.getActive();
            MessageStore.addMessage(message.to, message, activeContactId);

            if(inMsg.sender == activeContactId || inMsg.receiver == activeContactId) {
                MessageStore.emitUpdate();
            }
            MessageStore.emitChange();
            break;

        case ActionTypes.CONTACT_FILTER:
            if(_preActiveContactId) {
                unreadIndex = _messages[_preActiveContactId].firstUnreadMsgId;
                if(unreadIndex != null) {
                    _messages[_preActiveContactId].messages[unreadIndex].firstUnread = false;
                    _messages[_preActiveContactId].firstUnreadMsgId = null;
                }
            }
            break;
        case ActionTypes.UPDATE_MESSAGE_CONTENT:
            var payload = action.payload;
            var data = payload.data;
            var msg = _messages[payload.receiver].messages[payload.tempMessageId];
            msg.id = data.id;
            msg.sending = false;
            if (data.contentType == MessageContentTypes.IMAGE) {
                msg.fullImageUrl = data.fullImageUrl;
            }
            if(data.receiver == activeContactId) {
                MessageStore.emitUpdate();
            }
            MessageStore.emitChange();
            break;

        default:
            break;
    }

});

UnreadMessageStore.dispatchToken = ChatDispatcher.register(function(action) {
    ChatDispatcher.waitFor([
        ContactsStore.dispatchToken,
        MessageStore.dispatchToken
    ]);

    switch (action.type) {
        case ActionTypes.READ_MESSAGES:
            var readed = MessageStore.readMessages(action.contactId);
            if(readed) {
                UnreadMessageStore.emitChange();
            }
            break;
        case ActionTypes.NEW_OUT_MESSAGE:
            UnreadMessageStore.emitChange();
            break;
        case ActionTypes.NEW_IN_MESSAGE:
            UnreadMessageStore.emitChange();
            break;
        case ActionTypes.CLICK_CONTACT:
            if(action.changed) {
                UnreadMessageStore.emitChange();
            }
            break;

        case ActionTypes.RECEIVE_RAW_MESSAGES:
            UnreadMessageStore.emitChange();
            break;

        default:
            break;
    }
});

/************************************************************/
/*                 COMPONENTS                               */
/************************************************************/

var OperatorInfo = React.createClass({displayName: "OperatorInfo",
    getInitialState: function(){
        return {
            operator: AuthStore.getOperator()
        }
    },
    componentDidMount: function() {
        AuthStore.addChangeListener(this._onAuthChanged);
    },

    componentWillUnmount: function() {
        AuthStore.removeChangeListener(this._onAuthChanged);
    },
    _onAuthChanged: function(){
        this.setState({
           operator: AuthStore.getOperator()
        });
    },
    _onMuteVolumeChange: function(muted){
          if(muted){
              ChatActions.muteNotifications();
          }else{
              ChatActions.unmuteNotifications();
          }
    },
    render: function() {
        return (
            React.createElement("div", {className: "operator-info operator-" + this.state.operator.status}, 
                React.createElement(MuteUnmuteButton, {muted: false, onChange: this._onMuteVolumeChange}), 
                "  ", 
                React.createElement("i", {className: "fa fa-circle " + this.state.operator.status || 'offline'}), 
                "  ", 
                React.createElement("b", null, this.state.operator.name), " ", "(" + this.state.operator.nick + ")"
            )
        );
    }
});

var LoadMessageHistoryButton = React.createClass({displayName: "LoadMessageHistoryButton",
    getInitialState: function() {
        return {
            btnState: this.props.status || 'init'
        };
    },
    _onClick: function(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof this.props.onClick == 'function'){
            this.props.onClick();
        }
        this.setState({
            btnState: 'loading'
        });
    },
    componentWillReceiveProps: function(nextProps){
      this.setState({
         btnState: nextProps.status
      });
    },
    _renderState: function(){
        switch (this.state.btnState){
            case 'init':
                return (
                    React.createElement("div", {className: "history-load", style: {textAlign: 'center'}}, 
                        React.createElement("span", {className: "btn-badge"}, React.createElement("a", {onClick: this._onClick, href: "#"}, this.props.title))
                    )
                );
            case 'loading':
                return (
                    React.createElement("div", {className: "history-load", style: {textAlign: 'center'}}, 
                        React.createElement("span", {className: "btn-badge"}, React.createElement("b", null, this.props.titleLoading || 'Loading...'))
                    )
                );
                break;
            case 'loaded':
                return (
                    React.createElement("div", {className: "history-load", style: {textAlign: 'center'}}
                    )
                );
        }
    },
    render: function() {
        return this._renderState();
    }
});

var UploadImageButton = React.createClass({displayName: "UploadImageButton",
    getCoefficient: function(width, height, limit){
        var maxHW = Math.max(width, height);
        var coefficient = 1;
        if(maxHW > limit){
            coefficient = maxHW / limit;
        }
        return coefficient;
    },
    _onUploadedBase64: function(b64string, fullb64string){
        if(this.props.onImageBase64) {
            this.props.onImageBase64(b64string, fullb64string);
        }
    },
    _onFileChange: function(e){
        if (typeof window.FileReader !== 'function') {
            return;
        }
        var $fileUpload = this.refs.fileUpload;
        var file = $fileUpload.files[0];
        var fr = new FileReader();
        var self = this;

        fr.onload = function(){
            var img = new Image();
            img.onload = function(){
                var canvas = self.refs.imageCanvas;
                var imgWidth = self.img.width;
                var imgHeight = self.img.height;
                var coefficient = self.getCoefficient(imgWidth, imgHeight, 1280);
                canvas.width = imgWidth / coefficient;
                canvas.height = imgHeight / coefficient;

                var ctx = canvas.getContext("2d");
                ctx.drawImage(self.img,0,0,canvas.width, canvas.height);
                var fullb64string = canvas.toDataURL("image/png");

                coefficient = self.getCoefficient(imgWidth, imgHeight, 300);
                canvas.width = imgWidth / coefficient;
                canvas.height = imgHeight / coefficient;

                ctx.drawImage(self.img,0,0,canvas.width, canvas.height);
                var b64string = canvas.toDataURL("image/png");

                self._onUploadedBase64(b64string, fullb64string);
            };
            img.src = fr.result;
            self.img = img;
        };
        fr.readAsDataURL(file);
    },
    render: function() {
        return (
            React.createElement("i", {className: this.props.classes, style: { position: 'relative'}}, 
                React.createElement("form", {action: "#"}, 
                    React.createElement("input", {style: { opacity: 0, zIndex: 2, left: 0, top: 0, width: '100%', position: 'absolute'}, 
                           ref: "fileUpload", 
                           type: "file", 
                           accept: "image/*", 
                           onChange: this._onFileChange})
                ), 
                React.createElement("canvas", {ref: "imageCanvas", style: { display: 'none'}})
            )
        );
    }
});


var UnreadOutgoingMessage = React.createClass({displayName: "UnreadOutgoingMessage",
    scrolled: false,
    canScroll: function(){ return !this.scrolled; },
    scrollIntoViewIfNeeded: function (parent, centerIfNeeded) {
        if(!this.scrolled) {
            var node = ReactDOM.findDOMNode(this);
            CoreUtils.scrollIntoViewNeeded(parent, node, centerIfNeeded);
            this.scrolled = true;
        }
    },
    _onDownloadMessages: function(e){
        CoreUtils.downloadImageByUrl(this.props.data.fullImageUrl, 'Image viewing', 'chat-thumbnail.png');
        e.preventDefault();
        e.stopPropagation();
    },
    renderMessage: function(data){
        if(data.contentType == MessageContentTypes.TEXT){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == MessageContentTypes.IMAGE){
            return (
                React.createElement("a", {href: "#", onClick: this._onDownloadMessages}, 
                    React.createElement("img", {className: "image-message", src:  data.message})
                )
            );
        }
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                React.createElement("i", {className: "msg-badge"}, "operator")
            );
        } else {
            return '';
        }
    },
    render: function() {
        return (
            React.createElement("li", {className: "message-container clearfix messages-unread"}, 
                React.createElement("span", {className: "mark"}, "New messages"), 
                React.createElement("div", {className: "message-data align-right"}, 
                    React.createElement("span", {className: "message-data-time"}, 
                        CoreUtils.getCurrentTime(this.props.data.date), ", ",  CoreUtils.timeSince(this.props.data.date) 
                    ), "   ", 
                    React.createElement("span", {className: "message-data-name"}, 
                        this.props.data.fromName || 'Empty sender', 
                        this.operatorStatus()
                    ), 
                    "  "
                ), 
                React.createElement("div", {className: "message other-message float-right"}, 
                     this.renderMessage(this.props.data) 
                )
            )
        );
    }
});

var UnreadIncomingMessage = React.createClass({displayName: "UnreadIncomingMessage",
    scrolled: false,
    _onDownloadMessages: function(e){
        CoreUtils.downloadImageByUrl(this.props.data.fullImageUrl, 'Image viewing', 'chat-thumbnail.png');
        e.preventDefault();
        e.stopPropagation();
    },
    renderMessage: function(data){
        if(data.contentType == MessageContentTypes.TEXT){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == MessageContentTypes.IMAGE){
            return (
                React.createElement("a", {href: "#", onClick: this._onDownloadMessages}, 
                    React.createElement("img", {className: "image-message", src:  data.message})
                )
            );
        }
    },
    scrollIntoViewIfNeeded: function (parent, centerIfNeeded) {
        if(!this.scrolled) {
            var node = ReactDOM.findDOMNode(this);
            CoreUtils.scrollIntoViewNeeded(parent, node, centerIfNeeded);
            this.scrolled = true;
        }
    },
    canScroll: function(){
        return !this.scrolled;
    },
    _operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                React.createElement("i", {className: "msg-badge"}, "operator")
            );
        } else {
            return '';
        }
    },
    _operatorMsgClasses: function(){
        if (this.props.data.operator) {
            return ' other-operator';
        } else {
            return '';
        }
    },
    render: function() {
        return (
            React.createElement("li", {className: "message-container messages-unread"}, 
                React.createElement("span", {className: "mark"}, "New messages"), 
                React.createElement("div", {className: "message-data"}, 
                    React.createElement("span", {className: "message-data-name"}, 
                        this.props.data.fromName || 'Not specified', 
                        this._operatorStatus()
                    ), 
                    React.createElement("span", {className: "message-data-time"}, 
                         CoreUtils.getCurrentTime(this.props.data.date), ", ",  CoreUtils.timeSince(this.props.data.date) 
                    )
                ), 
                React.createElement("div", {className: "message my-message" + this._operatorMsgClasses()}, 
                     this.renderMessage(this.props.data) 
                )
            )
        );
    }
});

var UnreadEndConversationMessage = React.createClass({displayName: "UnreadEndConversationMessage",
    scrolled: false,
    scrollIntoViewIfNeeded: function (parent, centerIfNeeded) {
        if(!this.scrolled) {
            var node = ReactDOM.findDOMNode(this);
            CoreUtils.scrollIntoViewNeeded(parent, node, centerIfNeeded);
            this.scrolled = true;
        }
    },
    canScroll: function(){
        return !this.scrolled;
    },
    renderMessage: function(data){
        return (
            React.createElement("div", {className: "message-resolved"})
        );
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                React.createElement("i", {className: "msg-badge"}, "operator")
            );
        } else {
            return '';
        }
    },
    render: function() {
        return (
            React.createElement("li", {className: "message-container clearfix messages-unread"}, 
                React.createElement("span", {className: "mark"}, "New messages"), 
                React.createElement("div", {className: "message-data align-right"}, 
                    React.createElement("span", {className: "message-data-time"}, 
                         CoreUtils.getCurrentTime(this.props.data.date), ", ",  CoreUtils.timeSince(this.props.data.date) 
                    ), "   ", 
                    React.createElement("span", {className: "message-data-name"}, 
                        this.props.data.fromName || 'Empty sender', 
                        this.operatorStatus()
                    ), 
                    "  "
                ), 
                 this.renderMessage(this.props.data) 
            )
        );
    }
});


var TypingMessage = React.createClass({displayName: "TypingMessage",
    render: function() {
        var getCurrentTime = function () {
            return new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };
        return (
            React.createElement("li", null, 
                React.createElement("div", {className: "message-data"}, 
                    React.createElement("span", {className: "message-data-name"}, 
                        React.createElement("i", {className: "fa fa-circle online"}), 
                        this.props.phone || 'Not specified'
                    ), 
                    React.createElement("span", {className: "message-data-time"}, 
                        this.props.time || getCurrentTime()
                    )
                ), 
                React.createElement("i", {className: "fa fa-circle online"}), 
                React.createElement("i", {className: "fa fa-circle online", style: {color: '#AED2A6'}}), 
                React.createElement("i", {className: "fa fa-circle online", style: {color: '#DAE9DA'}})
            )
        );
    }
});


var OutgoingMessage = React.createClass({displayName: "OutgoingMessage",
    canScroll: function(){ return true; },
    scrollIntoViewIfNeeded: function (parent, centerIfNeeded) {
        var node = ReactDOM.findDOMNode(this);
        CoreUtils.scrollIntoViewNeeded(parent, node, centerIfNeeded);
    },
    _onDownloadMessages: function(e){
        CoreUtils.downloadImageByUrl(this.props.data.fullImageUrl, 'Image viewing', 'chat-thumbnail.png');
        e.preventDefault();
        e.stopPropagation();
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                React.createElement("i", {className: "msg-badge"}, "operator")
            );
        } else {
            return '';
        }
    },
    renderSendIndicator: function(data){
        if (data.sending) {
            return (
                React.createElement("span", {className: "fa fa-refresh fa-spin fa-fw send-icon"})
            )
        }else{
            return "";
        }
    },
    renderMessage: function(data){
        if(data.contentType == MessageContentTypes.TEXT){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == MessageContentTypes.IMAGE){
            return (
                React.createElement("a", {href: "#", onClick: this._onDownloadMessages}, 
                    React.createElement("img", {className: "image-message", src:  data.message})
                )
            );
        }
    },
    render: function() {
        return (
            React.createElement("li", {className: "clearfix"}, 
                React.createElement("div", {className: "message-data align-right"}, 
                    React.createElement("span", {className: "message-data-time"}, 
                        CoreUtils.getCurrentTime(this.props.data.date), ", ",  CoreUtils.timeSince(this.props.data.date) 
                    ), "   ", 
                    React.createElement("span", {className: "message-data-name"}, 
                        this.props.data.fromName || 'Empty sender', 
                        this.operatorStatus()
                    ), 
                    "  "
                ), 
                React.createElement("div", {className: "message other-message float-right"}, 
                     this.renderMessage(this.props.data), 
                     this.renderSendIndicator(this.props.data) 
                )
            )
        );
    }
});


var MinChatBox = React.createClass({displayName: "MinChatBox",
    getInitialState: function() {
        return {
            clientsCount: ContactsStore.getCountAll(),
            unreadCount: UnreadMessageStore.getAll()
        };
    },
    componentDidMount: function() {
        UnreadMessageStore.addChangeListener(this._onUnreadChange);
        ContactsStore.addChangeListener(this._onContactsChanged);
    },

    componentWillUnmount: function() {
        UnreadMessageStore.removeChangeListener(this._onUnreadChange);
        ContactsStore.removeChangeListener(this._onContactsChanged);
    },
    _onContactsChanged: function(){
        var count = ContactsStore.getCountAll();
        this.setState({
            clientsCount: count
        })
    },
    _onUnreadChange: function(){
        var count = UnreadMessageStore.getAll();
        this.setState({
            unreadCount: count
        })
    },
    _maximizeClicked: function(){
        if(typeof this.props.onMaximize == 'function'){
            this.props.onMaximize();
        }
    },
    render: function(){
        return (
            React.createElement("div", {className: "chat-container min-container clearfix"}, 
                React.createElement("div", {className: "msg-count center-text bg-"+this.props.status}, 
                    React.createElement("div", {className: "status"}, 
                        React.createElement("i", {className: "fa fa-circle " + this.props.status || 'offline'}), 
                        this.props.status
                    ), 
                    React.createElement("div", null, "Clients: ", React.createElement("i", {className: "clients-badge"}, this.state.clientsCount))
                ), 
                React.createElement("div", {className: "chat-info"}, 
                    "New: ", React.createElement("span", {className: "msg-badge unread"}, this.state.unreadCount), 
                    React.createElement(IconButton, {onClick: this._maximizeClicked, 
                                classes: "fa fa-2x fa-plus-square maximize-icon"})
                )
            )
        )
    }
});


var EmptyMinChatBox = React.createClass({displayName: "EmptyMinChatBox",
    _maximizeClicked: function(){
        if(typeof this.props.onMaximize == 'function'){
            this.props.onMaximize();
        }
    },
    render: function(){
        return (
            React.createElement("div", {className: "chat-container min-container clearfix"}, 
                React.createElement("div", {className: "msg-count-empty center-text"}, 
                    'Chat'
                ), 
                React.createElement("div", {className: "chat-info"}, 
                    React.createElement(IconButton, {onClick: this._maximizeClicked, 
                                classes: "fa fa-2x fa-plus-square maximize-icon"})
                )
            )
        )
    }
});


var LoginBox = React.createClass({displayName: "LoginBox",
    componentDidMount: function() {
        AuthStore.addChangeListener(this._onAuthChanged);
    },

    componentWillUnmount: function() {
        AuthStore.removeChangeListener(this._onAuthChanged);
    },

    getInitialState: function() {
        return {
            loginState: this.props.initialLoginState || 'login',
            error: false,
            messages: AuthStore.getErrors()
        };
    },
    _onAuthChanged: function(){
        if(AuthStore.getStatus() === AuthStatuses.SUCCESS) {
            this.successState();
            if(typeof this.props.onAuthSuccess == 'function') {
                setTimeout(function(){
                    this.props.onAuthSuccess(AuthStore.getOperator());
                }.bind(this), 1000);
            }
        }else{
            this.tryAgainState();
        }
    },
    _onMinimize: function(){
        this.setState({
            loginState: 'min',
            originalState: this.state.loginState
        });
    },
    _onMaximize: function(){
        this.setState({
            loginState: this.state.originalState
        });
    },
    progressState: function(){
        this.setState({
            loginState: 'progress',
            originalState: 'progress'
        });
    },
    successState: function(){
        this.setState({
            loginState: 'success',
            originalState: 'success',
            error: false,
            messages: []
        });
    },
    tryAgainState: function(){
        this.setState({
            loginState: 'login',
            originalState: 'login',
            error: true,
            messages: AuthStore.getErrors()
        });
    },
    loginClick: function(e){
        this.progressState();
        ChatActions.authenticate();
    },
    _renderErrorInfo: function(){
        if(this.state.error){
            return (
                React.createElement("div", {className: "error-box"}, 
                    React.createElement("ul", null, 
                        
                            this.state.messages.map(function (errMessage) {
                                return (
                                    React.createElement("li", null, errMessage)
                                )
                            })
                        
                    )
                )
            )
        }else{
            return "";
        }
    },
    renderState: function(){
        switch(this.state.loginState){
            case 'min':
                return (
                    React.createElement(EmptyMinChatBox, {onMaximize: this._onMaximize})
                );
            case 'login':
                return (
                    React.createElement("div", {className: "chat"}, 
                        React.createElement(EmptyHeaderBox, {onMinimize: this._onMinimize}), 
                        React.createElement("div", {className: "wrapper"}, 
                            this._renderErrorInfo(), 
                            React.createElement("button", {className: "login-btn", onClick: this.loginClick}, 
                                React.createElement("i", {className: "chat-spinner"}), 
                                React.createElement("span", {className: "state"}, "Log in")
                            )
                        )
                    )
                );
            case 'progress':
                return (
                    React.createElement("div", {className: "chat"}, 
                        React.createElement(EmptyHeaderBox, {onMinimize: this._onMinimize}), 
                        React.createElement("div", {className: "wrapper loading"}, 
                            React.createElement("button", {className: "login-btn"}, 
                                React.createElement("i", {className: "chat-spinner"}), 
                                React.createElement("span", {className: "state"}, "Authenticating")
                            )
                        )
                    )
                );
            case 'success':
                return (
                    React.createElement("div", {className: "chat"}, 
                        React.createElement(EmptyHeaderBox, {onMinimize: this._onMinimize}), 
                        React.createElement("div", {className: "wrapper ok loading"}, 
                            React.createElement("button", {className: "login-btn"}, 
                                React.createElement("i", {className: "chat-spinner"}), 
                                React.createElement("span", {className: "state"}, "Welcome back!")
                            )
                        )
                    )
                );

        }
    },
    render: function() {
        return this.renderState();
    }
});



var IncomingMessage = React.createClass({displayName: "IncomingMessage",
    _onDownloadMessages: function(e){
        CoreUtils.downloadImageByUrl(this.props.data.fullImageUrl, 'Image viewing', 'chat-thumbnail.png');
        e.preventDefault();
        e.stopPropagation();
    },
    renderMessage: function(data){
        if(data.contentType == MessageContentTypes.TEXT){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == MessageContentTypes.IMAGE){
            return (
                React.createElement("a", {href: "#", onClick: this._onDownloadMessages}, 
                    React.createElement("img", {className: "image-message", src:  data.message})
                )
            );
        }
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                React.createElement("i", {className: "msg-badge"}, "operator")
            );
        } else {
            return '';
        }
    },
    _operatorMsgClasses: function(){
        if (this.props.data.operator) {
            return ' other-operator';
        } else {
            return '';
        }
    },
    render: function() {
        return (
            React.createElement("li", null, 
                React.createElement("div", {className: "message-data"}, 
                    React.createElement("span", {className: "message-data-name"}, 
                        this.props.data.fromName || 'Not specified', 
                        this.operatorStatus()
                    ), 
                    React.createElement("span", {className: "message-data-time"}, 
                         CoreUtils.getCurrentTime(this.props.data.date), ", ",  CoreUtils.timeSince(this.props.data.date) 
                    )
                ), 
                React.createElement("div", {className: "message my-message" + this._operatorMsgClasses()}, 
                     this.renderMessage(this.props.data) 
                )
            )
        );
    }
});

var MuteUnmuteButton = React.createClass({displayName: "MuteUnmuteButton",
    _styles: {
        cursor:'pointer'
    },
    getInitialState: function(){
        return {
            muted: this.props.muted || false
        }
    },
    getClasses: function(){
        var commonClasses = 'msg-badge badge-sm ';
        if(this.state.muted){
            return commonClasses + 'fa fa-volume-off';
        }else{
            return commonClasses + 'fa fa-volume-up';
        }
    },
    _onClick: function(){
        if(typeof this.props.onChange == 'function'){
            this.props.onChange(!this.state.muted);
        }
        this.setState({
           muted: !this.state.muted
        });
    },
    render: function() {
        return (
            React.createElement("i", {style: this._styles, onClick: this._onClick, className: this.getClasses()})
        );
    }
});

var IconButton = React.createClass({displayName: "IconButton",
    render: function() {
        return (
            React.createElement("i", {onClick: this.props.onClick || function(){}, className: this.props.classes})
        );
    }
});


var HistoryButton = React.createClass({displayName: "HistoryButton",
    render: function() {
        return (
            React.createElement("button", {onClick: this.props.onClick, className: this.props.classes}, 
                React.createElement("i", {className: this.props.icons}), 
                "  ", this.props.title || ''
            )
        );
    }
});


var HistoryBox = React.createClass({displayName: "HistoryBox",
    scroll: 0,
    canScroll: true,
    renderMessage: function(message){
        var contact = this.props.contact;
        switch(message.messageType){
            case MessageTypes.INCOMING:
                if(message.firstUnread){
                    if(message.endOfConversation) {
                        return (
                            React.createElement(UnreadEndConversationMessage, {key: message.id, 
                                                          data: message, 
                                                          status: contact.status})
                        );
                    } else {
                        return (
                            React.createElement(UnreadIncomingMessage, {ref: "unreadItem", 
                                                   key: message.id, 
                                                   data: message, 
                                                   status: contact.status})
                        );
                    }
                }

                if(message.endOfConversation) {
                    return (
                        React.createElement(EndConversationMessage, {key: message.id, 
                                                data: message, 
                                                status: contact.status})
                    );
                } else {
                    return (
                        React.createElement(IncomingMessage, {key: message.id, 
                                         data: message, 
                                         status: contact.status})
                    );
                }
            case MessageTypes.OUTGOING:
                if(message.firstUnread){
                    if(message.endOfConversation) {
                        return (
                            React.createElement(UnreadEndConversationMessage, {key: message.id, 
                                                          data: message, 
                                                          status: contact.status})
                        )
                    } else {
                        return (
                            React.createElement(UnreadOutgoingMessage, {ref: "unreadItem", 
                                                   key: message.id, 
                                                   data: message, 
                                                   status: contact.status})
                        );
                    }
                }

                if(message.endOfConversation) {
                    return (
                        React.createElement(EndConversationMessage, {key: message.id, 
                                                data: message, 
                                                status: contact.status})
                    );
                }else{
                    return (
                        React.createElement(OutgoingMessage, {key: message.id, 
                                         data: message, 
                                         status: contact.status})
                    );
                }
        }
    },
    _scrollToFirstUnread: function(){
        var unreadItem = this.refs.unreadItem;
        var node = ReactDOM.findDOMNode(this);
        if(unreadItem && unreadItem.canScroll()){
            this.refs.unreadItem.scrollIntoViewIfNeeded(node, true);
            this.scroll = node.scrollHeight - node.offsetHeight;
        } else if (this.canScroll) {
            node.scrollTop = node.scrollHeight;
            this.scroll = node.scrollHeight - node.offsetHeight;
        }
    },
    _onLoadHistory: function(){
        if(typeof this.props.onLoadHistory == 'function'){
            this.props.onLoadHistory(this.props.contact);
        }
    },
    componentDidMount: function(){
        this._scrollToFirstUnread();
    },
    componentWillUpdate: function(nextProps, nextState) {
        if(nextProps.contact.id != this.props.contact.id){
            this.scroll = 0;
        }
        var node = ReactDOM.findDOMNode(this);
        this.canScroll = !this.props.messages.length || node.scrollTop >= this.scroll;
    },
    componentDidUpdate: function() {
        this._scrollToFirstUnread();
    },
    render: function() {
        var renderMessage = this.renderMessage;
        return (
            React.createElement("div", {className: "chat-history"}, 
                React.createElement(LoadMessageHistoryButton, {status: this.props.contact.loadStatus, 
                                          onClick: this._onLoadHistory, 
                                          title: "Load history", 
                                          titleLoading: "Loading..."}), 

                React.createElement("ul", {className: "chat-history-messages"}, 
                    
                        this.props.messages.map(function(message){
                            return renderMessage(message)
                        })
                    
                )
            )
        );
    }
});


var HeaderBox = React.createClass({displayName: "HeaderBox",
    closeClicked: function(e){
        if(typeof this.props.onClose == 'function') {
            this.props.onClose();
        }
    },
    _minimizeClicked: function(e){
        if(typeof this.props.onMinimize == 'function') {
            this.props.onMinimize();
        }
    },
    render: function() {
        return (
            React.createElement("div", {className: "chat-header clearfix"}, 
                React.createElement("div", {className: "chat-about"}, 
                    React.createElement("div", {className: "chat-with"}, " Chat with: ", this.props.contact.name || ''), 
                    React.createElement("div", {className: "chat-num-messages"}, 
                        "already", 
                        React.createElement("i", {className: "msg-badge"}, this.props.count || 0), 
                        "messages"
                    )
                ), 
                React.createElement(IconButton, {onClick: this.closeClicked, classes: "fa fa-times header-icon"}), 
                React.createElement(IconButton, {onClick: this._minimizeClicked, classes: "fa fa-minus-square header-icon"})
            )
        );
    }
});


var FooterBox = React.createClass({displayName: "FooterBox",
    getInitialState: function() {
        return {
            value: ''
        };
    },
    sendMessage: function(e){
        if(this.state.value.trim() !== '') {
            var dt = new Date();
            var msg = {
                id: 'temp_' + (++_lastMessageId),
                message: this.state.value,
                sender: this.props.operator.nick,
                operatorName: this.props.operator.name,
                receiver: this.props.contact.name,
                contentType: MessageContentTypes.TEXT,
                messageType: MessageTypes.OUTGOING,
                endOfConversation: false,
                date: dt,
                sending: true,
                fullImage: null
            };
            ChatActions.outgoingMessage(msg);
            this.setState({value: ''});
        }
    },
    sendEndMessage: function(e){
        var dt = new Date();
        var msg = {
            id: 'temp_' + (++_lastMessageId),
            message: 'End of conversation',
            sender: this.props.operator.nick,
            operatorName: this.props.operator.name,
            receiver: this.props.contact.name,
            contentType: MessageContentTypes.TEXT,
            messageType: MessageTypes.OUTGOING,
            endOfConversation: true,
            date: dt,
            sending: true,
            fullImage: null
        };
        ChatActions.outgoingMessage(msg);
    },
    handleChange: function(event){
        this.setState({value: event.target.value});
    },
    handleKeyUp: function(event){
        if (event.keyCode === KeyConstants.ENTER_KEY) {
            this.sendMessage();
        }
    },
    _onImageUpload: function(b64string, fullBase64string){
        var dt = new Date();
        var msg = {
            id: null,
            message: b64string,
            sender: this.props.operator.nick,
            operatorName: this.props.operator.name,
            receiver: this.props.contact.name,
            contentType: MessageContentTypes.IMAGE,
            messageType: MessageTypes.OUTGOING,
            endOfConversation: false,
            date: dt,
            sending: true,
            fullImage: fullBase64string
        };
        ChatActions.outgoingMessage(msg);
    },
    render: function() {
        return (
            React.createElement("div", {className: "chat-message clearfix"}, 
                React.createElement("textarea", {name: "message-to-send", 
                          id: "message-to-send", 
                          placeholder: "Type your message", 
                          value: this.state.value, 
                          onChange: this.handleChange, 
                          onKeyUp: this.handleKeyUp, 
                          rows: "2"}), 
                React.createElement(IconButton, {classes: "fa fa-file-o"}), "   ", 
                React.createElement(UploadImageButton, {onImageBase64: this._onImageUpload, classes: "fa fa-file-image-o"}), 
                React.createElement(HistoryButton, {onClick: this.sendMessage, title: "send", icons: "fa fa-paper-plane-o", classes: "btn-send"}), 
                React.createElement(HistoryButton, {onClick: this.sendEndMessage, title: "end", icons: "fa fa-comments", classes: "btn-replied"})
            )
        );
    }
});


var EndConversationMessage = React.createClass({displayName: "EndConversationMessage",
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                React.createElement("i", {className: "msg-badge"}, "operator")
            );
        } else {
            return '';
        }
    },
    renderMessage: function(data){
        return (
            React.createElement("div", {className: "message-resolved"})
        );
    },
    render: function() {
        return (
            React.createElement("li", {className: "clearfix"}, 
                React.createElement("div", {className: "message-data align-right"}, 
                    React.createElement("span", {className: "message-data-time"}, 
                         CoreUtils.getCurrentTime(this.props.data.date), ", ",  CoreUtils.timeSince(this.props.data.date) 
                    ), "   ", 
                    React.createElement("span", {className: "message-data-name"}, 
                        this.props.data.fromName || 'Empty sender', 
                        this.operatorStatus()
                    ), 
                    "  "
                ), 

                 this.renderMessage(this.props.data) 

            )
        );
    }
});

var EmptyHeaderBox = React.createClass({displayName: "EmptyHeaderBox",
    _onMinimize: function(){
        if(typeof this.props.onMinimize == 'function'){
            this.props.onMinimize();
        }
    },
    render: function() {
        return (
            React.createElement("div", {className: "chat-header clearfix"}, 
                React.createElement(IconButton, {onClick: this._onMinimize, classes: "fa fa-minus-square header-icon"})
            )
        );
    }
});

var EmptyConversationBox = React.createClass({displayName: "EmptyConversationBox",
    _onMinimize: function(){
        if(typeof this.props.onMinimize == 'function'){
            this.props.onMinimize();
        }
    },
    render: function() {
        return (
            React.createElement("div", {className: "chat"}, 
                React.createElement(EmptyHeaderBox, {onMinimize: this._onMinimize}), 
                React.createElement(EmptyChatBox, null)
            )
        );
    }
});

var EmptyChatBox = React.createClass({displayName: "EmptyChatBox",
    render: function() {
        return (
            React.createElement("div", {className: "wrapper no-conversation"}, 
                React.createElement("div", null, React.createElement("i", {className: "fa fa-4x fa-comment"})), 
                React.createElement("span", {className: "state"}, "No conversation")
            )
        )
    }
});

var ConversationBox = React.createClass({displayName: "ConversationBox",
    _onClose: function(){
        if(typeof this.props.onClose == 'function'){
            this.props.onClose();
        }
    },
    _onMinimize: function(){
        if(typeof this.props.onMinimize == 'function'){
            this.props.onMinimize();
        }
    },
    _onOutMessage: function(message){
        if (typeof this.props.onOutgoingMessage == 'function'){
            this.props.onOutgoingMessage(message);
        }
    },
    _onLoadHistory: function(contact){
        if(typeof this.props.onLoadHistory == 'function'){
            this.props.onLoadHistory(contact);
        }
    },
    render: function() {
        return (
            React.createElement("div", {className: "chat"}, 
                React.createElement(HeaderBox, {contact: this.props.contact, count: this.props.messages.length, 
                           onClose: this._onClose, 
                           onMinimize: this._onMinimize}), 
                React.createElement(HistoryBox, {contact: this.props.contact, messages: this.props.messages, 
                            onLoadHistory: this._onLoadHistory}), 
                React.createElement(FooterBox, {operator: this.props.operator, contact: this.props.contact, onMessage: this._onOutMessage})
            )
        );
    }
});


var ContactsListBox = React.createClass({displayName: "ContactsListBox",
    onActivateContact: function(contact){
        if(typeof this.props.onSelectContact == 'function'){
            this.props.onSelectContact(contact);
        }
    },
    render: function() {
        var selectedId = this.props.current ? this.props.current.name : null;
        var onActivateContact = this.onActivateContact;
        return (
            React.createElement("ul", {className: "list"}, 
                
                    this.props.items.map(function(contact){
                        return (
                            React.createElement(Contact, {key: contact.id, 
                                     data: contact, 
                                     selectedId: selectedId, 
                                     onActivate: onActivateContact})
                        )
                    })
                
            )
        );
    }
});

var ContactSearchBox = React.createClass({displayName: "ContactSearchBox",
    getInitialState: function() {
        return {
            value: ''
        }
    },
    _handleChange: function(event){
        this.setState({value: event.target.value});
        if(typeof this.props.onLiveSearch == 'function'){
            this.props.onLiveSearch(event.target.value);
        }
    },
    _handleKeyUp: function(event){
        if (event.keyCode === KeyConstants.ENTER_KEY) {
            this._onSearch();
        }
    },
    _onSearch: function(){
        if(typeof this.props.onSearch == 'function'){
            this.props.onSearch(this.state.value);
        }
    },
    _onClear: function(){
        this.setState({
            value: ''
        });
        if(typeof this.props.onClear == 'function'){
            this.props.onClear();
        }
    },
    render: function() {
        return (
            React.createElement("div", {className: "search"}, 
                React.createElement("input", {className: "search-input", 
                       onChange: this._handleChange, 
                       onKeyUp: this._handleKeyUp, 
                       type: "text", placeholder: "search", value: this.state.value}), 
                React.createElement("i", {onClick: this._onSearch, className: "fa fa-search"}), 
                React.createElement("i", {onClick: this._onClear, className: "fa fa-close"})
            )
        );
    }
});



var ContactsBox = React.createClass({displayName: "ContactsBox",
    _onSearch: function(pattern){
        ChatActions.contactFilter(pattern);
    },
    _onClear: function(){
        ChatActions.contactFilter("");
    },
    _onLiveSearch: function(pattern){
        ChatActions.contactFilter(pattern);
    },
    _onSelectContact: function(contact){
        if(typeof this.props.onSelectContact == 'function'){
            this.props.onSelectContact(contact);
        }
    },
    render: function() {
        return (
            React.createElement("div", {className: "people-list", id: "people-list"}, 
                React.createElement(ContactSearchBox, {onLiveSearch: this._onLiveSearch, 
                                  onSearch: this._onSearch, 
                                  onClear: this._onClear}), 
                React.createElement(OperatorInfo, null), 
                React.createElement(ContactsListBox, {items: this.props.contacts, 
                                 current: this.props.current, 
                                 onSelectContact: this._onSelectContact})
            )
        );
    }
});

var Contact = React.createClass({displayName: "Contact",
    getInitialState: function() {
        var unreadCount = UnreadMessageStore.getCount(this.props.data.name);
        var participants = ParticipantsStore.getParticipants(this.props.data.name);
        return {
            active: false,
            unread: unreadCount,
            participants: participants
        }
    },

    componentDidMount: function() {
        UnreadMessageStore.addChangeListener(this._onUnreadChange);
        ParticipantsStore.addChangeListener(this._participantsChange);
    },

    componentWillUnmount: function() {
        UnreadMessageStore.removeChangeListener(this._onUnreadChange);
        ParticipantsStore.removeChangeListener(this._participantsChange);
    },

    _onUnreadChange: function(){
        var unread = UnreadMessageStore.getCount(this.props.data.name);
        this.setState({
            unread: unread
        });
    },

    _participantsChange: function(){
        var data = ParticipantsStore.getParticipants(this.props.data.name);
        if(data.length > 0) {
            this.setState({
                participants: data
            });
        }
    },
    _getParticipants: function(){
        if(this.state.participants) {
            return (
                React.createElement("span", null, 
                
                    this.state.participants.map(function (name, index) {
                        return (
                            React.createElement("span", {key: index, className: "msg-badge badge-sm"}, name)
                        );
                    })
                
                )
            );

        }
        return '';
    },
    activateContact: function(){
        if(typeof this.props.onActivate == 'function'){
            this.props.onActivate(this.props.data);
        }
    },
    getUnreadMessageCount: function(){
        if(this.state.unread || 0 > 0) {
            return (
                React.createElement("i", {className: "msg-badge unread"}, this.state.unread || 0)
            )
        }
        return '';
    },
    clientActive: function(){
        var contact = this.props.data;
        if(this.props.selectedId == contact.name){
            return ' active';
        }
        return '';
    },
    render: function() {
        return (
            React.createElement("li", {className: "contact clearfix" + this.clientActive(), onClick: this.activateContact}, 
                React.createElement("div", {className: "about"}, 
                    React.createElement("div", {className: "name"}, this.props.data.name || '+000000000000'), 
                    React.createElement("div", {className: "status"}, 
                        React.createElement("i", {className: "fa fa-circle " + this.props.data.status || 'offline'}), 
                        this.props.data.status || 'offline'
                    ), 
                    React.createElement("div", null, 
                        this._getParticipants()
                    ), 
                    React.createElement("div", {className: "msg-unread"}, 
                        this.getUnreadMessageCount()
                    )
                )
            )
        );
    }
});

var ChatBox = React.createClass({displayName: "ChatBox",
    getInitialState: function() {
        return {
            chatState: this.props.initialChatState || 'login',
            contacts: [],
            messages: [],
            currentContact: {},
            operator: {},
            unread: 0
        };
    },

    componentDidMount: function() {
        AuthStore.addChangeListener(this._onAuthChanged);
        ContactsStore.addChangeListener(this._storeContactsChange);
        ContactsStore.addContactSelectListener(this._storeContactSelect);
        MessageStore.addUpdateListener(this._storeMessagesChange);
    },

    componentWillUnmount: function() {
        AuthStore.removeChangeListener(this._onAuthChanged);
        ContactsStore.removeChangeListener(this._storeContactsChange);
        ContactsStore.removeContactSelectListener(this._storeContactSelect);
        MessageStore.removeUpdateListener(this._storeMessagesChange);
    },

    _onAuthChanged: function(){
        this.setState({operator: AuthStore.getOperator()});
    },

    _onSelectContact: function(contact){
        ChatActions.clickContact(contact.name);
        ChatActions.readMessages(contact.name);
        if(contact.loadStatus == 'init') {
            var firstMsgId = MessageStore.getFirstMessageId(contact.name);
            ChatActions.fetchContactHistory(contact, firstMsgId);
        }
    },

    _storeContactSelect: function(){
        var contact = ContactsStore.getCurrentContact();
        this.setState({
            chatState: 'chat',
            currentContact: contact
        });
    },

    _storeContactsChange: function(){
        var currentContact = ContactsStore.getCurrentContact();
        var name = currentContact && currentContact.name || null;
        this.setState({
            chatState: currentContact ? 'chat' : 'no-chat',
            currentContact: currentContact,
            messages: MessageStore.getMessages(name),
            contacts: ContactsStore.getAll()
        });
    },

    _storeMessagesChange: function(){
        var currentContact = ContactsStore.getCurrentContact();
        if(currentContact) {
            this.setState({
                currentContact: currentContact,
                messages: MessageStore.getMessages(currentContact.name)
            });
        }
    },
    authSuccess: function(operator){
        this.setState({
            operator: operator,
            chatState: 'no-chat'
        });
        ChatActions.fetchContacts();
    },
    onConversationClose: function(){
        this.setState({
            chatState: 'no-chat',
            messages:[],
            currentContact: {}
        });
        ChatActions.clearSelected();
    },
    _onMinimize: function(){
        this.setState({
            chatState: 'min',
            messages:[],
            currentContact: {}
        });
        ChatActions.clearSelected();
    },
    _onMaximize: function(){
        this.setState({
            chatState: 'no-chat',
            messages:[],
            currentContact: {}
        });
    },
    _onLoadHistory: function(contact){
        var firstMsgId = MessageStore.getFirstMessageId(contact.name);
        ChatActions.fetchContactHistory(contact, firstMsgId);
    },
    onOutgoingMessage: function(data){
        var operator = this.state.operator;
        var currentContact = this.state.currentContact;
        MessageStore.addOutMessage({
            contact: currentContact,
            operator: operator,
            data: data,
            type: MessageContentTypes.TEXT
        });
    },
    renderState: function(){
        switch(this.state.chatState || 'login'){
            case 'min':
                return (
                    React.createElement(MinChatBox, {onMaximize: this._onMaximize, 
                                status: this.state.operator.status})
                );
            case 'login':
                return (
                    React.createElement("div", {id: "chat-template", className: "chat-container clearfix"}, 
                        React.createElement(LoginBox, {onAuthSuccess: this.authSuccess})
                    )
                );
            case 'chat':
                return (
                    React.createElement("div", {id: "chat-template", className: "chat-container clearfix"}, 
                        React.createElement(ContactsBox, {current: this.state.currentContact, 
                                     contacts: this.state.contacts, 
                                     onSelectContact: this._onSelectContact}), 
                        React.createElement(ConversationBox, {contact: this.state.currentContact, 
                                         operator: this.state.operator, 
                                         messages: this.state.messages, 
                                         onClose: this.onConversationClose, 
                                         onMinimize: this._onMinimize, 
                                         onOutgoingMessage: this.onOutgoingMessage, 
                                         onLoadHistory: this._onLoadHistory})
                    )
                );
            case 'no-chat':
                return (
                    React.createElement("div", {id: "chat-template", className: "chat-container clearfix"}, 
                        React.createElement(ContactsBox, {contacts: this.state.contacts, onSelectContact: this._onSelectContact}), 
                        React.createElement(EmptyConversationBox, {onMinimize: this._onMinimize})
                    )
                )
        }
    },
    render: function() {
        return this.renderState();
    }
});

/******************************************/
/*                APPLICATION             */
/******************************************/

var chatBox = ReactDOM.render(
    React.createElement(ChatBox, null),
    document.getElementById('chatbox'),
    function(){
        if(typeof window.OkkChatReady == 'function') {
            var OkkChatApi = {
                Dispatcher: ChatDispatcher,
                ActionTypes: ActionTypes,
                Actions: ChatActions,
                Stores: {
                    AuthStore: AuthStore,
                    ContactsStore: ContactsStore,
                    MessageStore: MessageStore,
                    ParticipantsStore: ParticipantsStore,
                    UnreadMessageStore: UnreadMessageStore
                },
                MessageTypes: MessageTypes,
                MessageContentTypes: MessageContentTypes,
                CoreUtils: CoreUtils
            };
            window.OkkChatReady(OkkChatApi);
        }
    }
);

/******************************************/
/*                EXPORTS                 */
/******************************************/
