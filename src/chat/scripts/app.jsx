var _lastMessageId = 1;
var _messages = {};
var _contacts = {};
var _fullMessageImages = {};
var _chatParticipants = {};

var _activeContactId,
    _preActiveContactId,
    _contactFilterPattern = '',
    _currentOperator;

var MessageContentTypes = {
    IMAGE: 'image',
    TEXT: 'text'
};

var MessageTypes = {
    INCOMING: 'in',
    OUTGOING: 'out',
    END_OF_CONVERSATION: 'end-of-conversation'
};

var ChatConstants = {
    MESSAGE_CHANGE_EVENT: 'MESSAGE_CHANGED_EVENT',
    CONTACT_SELECT_EVENT: 'CONTACT_SELECT_EVENT',
    MESSAGE_UPDATE_EVENT: 'MESSAGE_UPDATE_EVENT',
    CONTACTS_CHANGE_EVENT: 'CONTACTS_CHANGE_EVENT',
    FULL_IMAGES_CHANGE_EVENT: 'FULL_IMAGES_CHANGE_EVENT',
    OPERATOR_CHANGED: 'OPERATOR_CHANGED',
    PARTICIPANTS_CHANGED: 'PARTICIPANTS_CHANGED'
};

var ActionTypes = {
    CLICK_CONTACT: 'CLICK_CONTACT',
    RECEIVE_RAW_MESSAGES: 'RECEIVE_RAW_MESSAGES',
    NEW_OUT_MESSAGE: 'NEW_OUT_MESSAGE',
    NEW_IN_MESSAGE: 'NEW_IN_MESSAGE',
    READ_MESSAGES: 'READ_MESSAGES',
    CONTACT_MESSAGES_SCROLL: 'CONTACT_MESSAGES_SCROLL',
    CONTACT_FILTER: 'CONTACT_FILTER',
    CLEAR_SELECTED_CONTACT: 'CLEAR_SELECTED_CONTACT',
    AUTH_SUCCESS: 'AUTH_SUCCESS',
    AUTH_FAIL: 'AUTH_FAIL',
    PUT_FULL_IMAGE: 'PUT_FULL_IMAGE',
    API_FETCH_CONTACTS: 'API_FETCH_CONTACTS',
    API_AUTH_OPERATOR: 'API_AUTH_OPERATOR',
    API_FETCH_CONTACT_MESSAGES: 'API_FETCH_CONTACT_MESSAGES',
    API_FETCH_CONTACT_HISTORY: 'API_FETCH_CONTACT_HISTORY'
};

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
        var messageType = raw.messageType;

        if(messageType != MessageTypes.END_OF_CONVERSATION && operatorName){
            raw.messageType = raw.sender != operatorName
                ? MessageTypes.INCOMING
                : MessageTypes.OUTGOING;
        }

        if (!raw.receiver) {
            raw.receiver = raw.sender;
        }

        var result = {
            id: 'm_' + raw.id,
            from: raw.sender,
            to: raw.receiver,
            message: raw.message,
            contentType: raw.contentType,
            messageType: raw.messageType,
            operator: raw.operator,
            date: raw.date,
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

            coefficient = self.getCoefficient(imgWidth, imgHeight, 150);
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
    outgoingMessage: function (data) {
        var id = data.id || (++_lastMessageId);
        ChatDispatcher.dispatch({
            type: ActionTypes.NEW_OUT_MESSAGE,
            payload:{
                id: id,
                message: data.message,
                sender: data.sender.name,
                receiver: data.receiver.name,
                contentType: data.contentType,
                messageType: data.messageType,
                date: data.date,
                fullImage: data.fullImage,
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
            CoreUtils.getThumbnailBase64(msg.message, function (b64string, fullB64Image) {
                ChatDispatcher.dispatch({
                    type: ActionTypes.NEW_IN_MESSAGE,
                    payload: {
                        id: msg.id,
                        message: b64string,
                        sender: msg.sender,
                        receiver: msg.receiver,
                        contentType: msg.contentType,
                        messageType: msg.messageType || MessageTypes.INCOMING,
                        date: msg.date,
                        fullImage: fullB64Image,
                        operator: msg.operator
                    }
                });
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
                    fullImage: null,
                    operator: msg.operator
                }
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

    fetchContactHistory: function(contact){
        ChatDispatcher.dispatch({
           type: ActionTypes.API_FETCH_CONTACT_HISTORY,
           contact: contact
        });
    }
};



/**************************************************/
/*                  STORES                        */
/**************************************************/

var AuthStore = objectAssign({}, EventEmitter.prototype, {

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

var FullImageStore = objectAssign({}, EventEmitter.prototype, {

    emitChange: function() {
        this.emit(ChatConstants.FULL_IMAGES_CHANGE_EVENT);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(ChatConstants.FULL_IMAGES_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(ChatConstants.FULL_IMAGES_CHANGE_EVENT, callback);
    },

    putFullImage: function(id, b64string){
        if(b64string) {
            _fullMessageImages[id] = b64string;
        }
    },

    getFullImage: function(id) {
        return _fullMessageImages[id];
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
    addContactRawMessages: function(operator, rawMessages){
        var historyMessages = {};
        var contactId = null;
        CoreUtils.asyncLoop({
            length: rawMessages.length,
            run: function(loop, i){
                var rawMessage = rawMessages[i];
                var isRead = true;

                var message = CoreUtils.mapMessageFromRaw(
                    rawMessage,
                    isRead,
                    operator
                );

                if(!contactId){contactId = message.to;}

                if(message.contentType == MessageContentTypes.IMAGE) {
                    CoreUtils.getThumbnailBase64(message.message, function (thumb, full) {
                        message.message = thumb;
                        ChatActions.putFullImage(message.id, full);
                        historyMessages[message.id] = message;
                        loop();
                    });
                }else{
                    historyMessages[message.id] = message;
                    loop();
                }
            },
            callback: function(){
                MessageStore.addHistoryMessages(contactId, historyMessages);
                MessageStore.emitUpdate();
            }
        });
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
            id: 'm_' + _lastMessageId,
            from: data.operator.name,
            to: data.contact.name,
            message: data.data.message,
            contentType: data.type,
            messageType: MessageTypes.OUTGOING,
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
            _contacts[rawContact.name] = {
                id: rawContact.id,
                name: rawContact.name,
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
        default:
            break;
    }
});

FullImageStore.dispatchToken = ChatDispatcher.register(function(action) {
    switch (action.type) {
        case ActionTypes.PUT_FULL_IMAGE:
            FullImageStore.putFullImage(action.messageId, action.imageData);
            FullImageStore.emitChange();
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
            FullImageStore.putFullImage(message.id, outMsg.fullImage);

            if(outMsg.receiver == activeContactId) {
                MessageStore.emitUpdate();
            }
            MessageStore.emitChange();
            break;
        case ActionTypes.NEW_IN_MESSAGE:
            var inMsg = action.payload;
            message = CoreUtils.mapMessageFromRaw(inMsg);
            activeContactId = ContactsStore.getActive();
            MessageStore.addMessage(message.to, message, activeContactId);
            FullImageStore.putFullImage(message.id, inMsg.fullImage);

            if(inMsg.sender == activeContactId) {
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

var LoadMessageHistoryButton = React.createClass({
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
                    <div className="history-load" style={{textAlign: 'center'}}>
                        <span className="btn-badge"><a onClick={this._onClick} href="#">{this.props.title}</a></span>
                    </div>
                );
            case 'loading':
                return (
                    <div className="history-load" style={{textAlign: 'center'}}>
                        <span className="btn-badge"><b>{this.props.titleLoading || 'Loading...'}</b></span>
                    </div>
                );
                break;
            case 'loaded':
                return (
                    <div className="history-load" style={{textAlign: 'center'}}>
                    </div>
                );
        }
    },
    render: function() {
        return this._renderState();
    }
});

var UploadImageButton = React.createClass({
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

                coefficient = self.getCoefficient(imgWidth, imgHeight, 150);
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
            <i className={this.props.classes} style={{ position: 'relative'  }}>
                <form action='#'>
                    <input style={{ opacity: 0, zIndex: 2, left: 0, top: 0, width: '100%', position: 'absolute' }}
                           ref="fileUpload"
                           type="file"
                           accept="image/*"
                           onChange={this._onFileChange}/>
                </form>
                <canvas ref="imageCanvas" style={{ display: 'none' }}></canvas>
            </i>
        );
    }
});


var UnreadOutgoingMessage = React.createClass({
    _onDownloadMessages: function(e){
        var message = FullImageStore.getFullImage(this.props.data.id);
        CoreUtils.downloadImage(message, 'Image viewing', 'chat-thumbnail.png');
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
                <a href="#" onClick={this._onDownloadMessages} >
                    <img className="image-message" src={ data.message } />
                </a>
            );
        }
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                <i className="msg-badge">operator</i>
            );
        } else {
            return '';
        }
    },
    render: function() {
        return (
            <li className="message-container clearfix messages-unread">
                <span className="mark">New messages</span>
                <div className="message-data align-right">
                    <span className="message-data-time">
                        {CoreUtils.getCurrentTime(this.props.data.date)}, {'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">
                        {this.props.data.from || 'Empty sender'}
                        {this.operatorStatus()}
                    </span>
                    &nbsp;&nbsp;
                    <i className={"fa fa-circle " + (this.props.status || 'me')}></i>
                </div>
                <div className="message other-message float-right">
                    { this.renderMessage(this.props.data) }
                </div>
            </li>
        );
    }
});

var UnreadIncomingMessage = React.createClass({
    scrolled: false,
    _onDownloadMessages: function(e){
        var message = FullImageStore.getFullImage(this.props.data.id);
        CoreUtils.downloadImage(message, 'Image viewing', 'chat-thumbnail.png');
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
                <a href="#" onClick={this._onDownloadMessages} >
                    <img className="image-message" src={ data.message } />
                </a>
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
                <i className="msg-badge">operator</i>
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
            <li className="message-container messages-unread">
                <span className="mark">New messages</span>
                <div className="message-data">
                    <span className="message-data-name">
                        <i className={"fa fa-circle " + (this.props.status || 'offline')}></i>
                        {this.props.data.from || 'Not specified'}
                        {this._operatorStatus()}
                    </span>
                    <span className="message-data-time">
                        { CoreUtils.getCurrentTime(this.props.data.date) }, {'Today'}
                    </span>
                </div>
                <div className={"message my-message" + this._operatorMsgClasses() }>
                    { this.renderMessage(this.props.data) }
                </div>
            </li>
        );
    }
});

var UnreadEndConversationMessage = React.createClass({
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
            <div className="message-resolved"></div>
        );
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                <i className="msg-badge">operator</i>
            );
        } else {
            return '';
        }
    },
    render: function() {
        return (
            <li className="message-container clearfix messages-unread">
                <span className="mark">New messages</span>
                <div className="message-data align-right">
                    <span className="message-data-time">
                        { CoreUtils.getCurrentTime(this.props.data.date) }, {'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">
                        {this.props.data.from || 'Empty sender'}
                        {this.operatorStatus()}
                    </span>
                    &nbsp;&nbsp;
                    <i className={"fa fa-circle " + (this.props.status || 'me')}></i>
                </div>
                { this.renderMessage(this.props.data) }
            </li>
        );
    }
});


var TypingMessage = React.createClass({
    render: function() {
        var getCurrentTime = function () {
            return new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };
        return (
            <li>
                <div className="message-data">
                    <span className="message-data-name">
                        <i className="fa fa-circle online"></i>
                        {this.props.phone || 'Not specified'}
                    </span>
                    <span className="message-data-time">
                        {this.props.time || getCurrentTime()}
                    </span>
                </div>
                <i className="fa fa-circle online"></i>
                <i className="fa fa-circle online" style={{color: '#AED2A6'}}></i>
                <i className="fa fa-circle online" style={{color: '#DAE9DA'}}></i>
            </li>
        );
    }
});


var OutgoingMessage = React.createClass({
    _onDownloadMessages: function(e){
        var message = FullImageStore.getFullImage(this.props.data.id);
        CoreUtils.downloadImage(message, 'Image viewing', 'chat-thumbnail.png');
        e.preventDefault();
        e.stopPropagation();
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                <i className="msg-badge">operator</i>
            );
        } else {
            return '';
        }
    },
    renderMessage: function(data){
        if(data.contentType == MessageContentTypes.TEXT){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == MessageContentTypes.IMAGE){
            return (
                <a href="#" onClick={this._onDownloadMessages} >
                    <img className="image-message" src={ data.message } />
                </a>
            );
        }
    },
    render: function() {
        return (
            <li className="clearfix">
                <div className="message-data align-right">
                    <span className="message-data-time">
                        {CoreUtils.getCurrentTime(this.props.data.date)}, {'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">
                        {this.props.data.from || 'Empty sender'}
                        {this.operatorStatus()}
                    </span>
                    &nbsp;&nbsp;
                    <i className={"fa fa-circle " + (this.props.status || 'me')}></i>
                </div>
                <div className="message other-message float-right">
                    { this.renderMessage(this.props.data) }
                </div>
            </li>
        );
    }
});


var MinChatBox = React.createClass({
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
            <div className="chat-container min-container clearfix">
                <div className={"msg-count center-text bg-"+this.props.status}>
                    <div className="status">
                        <i className={"fa fa-circle " + this.props.status || 'offline' }></i>
                        {this.props.status}
                    </div>
                    <div>Clients: <i className="clients-badge">{this.state.clientsCount}</i></div>
                </div>
                <div className="chat-info">
                    New: <span className="msg-badge unread">{this.state.unreadCount}</span>
                    <IconButton onClick={this._maximizeClicked}
                                classes="fa fa-2x fa-plus-square maximize-icon"/>
                </div>
            </div>
        )
    }
});


var EmptyMinChatBox = React.createClass({
    _maximizeClicked: function(){
        if(typeof this.props.onMaximize == 'function'){
            this.props.onMaximize();
        }
    },
    render: function(){
        return (
            <div className="chat-container min-container clearfix">
                <div className="msg-count-empty center-text">
                    {'Chat'}
                </div>
                <div className="chat-info">
                    <IconButton onClick={this._maximizeClicked}
                                classes="fa fa-2x fa-plus-square maximize-icon"/>
                </div>
            </div>
        )
    }
});


var LoginBox = React.createClass({
    componentDidMount: function() {
        AuthStore.addChangeListener(this._onAuthChanged);
    },

    componentWillUnmount: function() {
        AuthStore.removeChangeListener(this._onAuthChanged);
    },

    getInitialState: function() {
        return {loginState: this.props.initialLoginState || 'login'};
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
            originalState: 'success'
        });
    },
    tryAgainState: function(){
        this.setState({
            loginState: 'login',
            originalState: 'login'
        });
    },
    loginClick: function(e){
        this.progressState();
        ChatActions.authenticate({session: 'EdsSRssdAQwDRtdf'});
    },
    renderState: function(){
        switch(this.state.loginState){
            case 'min':
                return (
                    <EmptyMinChatBox onMaximize={this._onMaximize}/>
                );
            case 'login':
                return (
                    <div className="chat">
                        <EmptyHeaderBox onMinimize={this._onMinimize}/>
                        <div className="wrapper">
                            <button className="login-btn" onClick={this.loginClick}>
                                <i className="chat-spinner"></i>
                                <span className="state">Log in</span>
                            </button>
                        </div>
                    </div>
                );
            case 'progress':
                return (
                    <div className="chat">
                        <EmptyHeaderBox onMinimize={this._onMinimize}/>
                        <div className="wrapper loading">
                            <button className="login-btn">
                                <i className="chat-spinner"></i>
                                <span className="state">Authenticating</span>
                            </button>
                        </div>
                    </div>
                );
            case 'success':
                return (
                    <div className="chat">
                        <EmptyHeaderBox onMinimize={this._onMinimize}/>
                        <div className="wrapper ok loading">
                            <button className="login-btn">
                                <i className="chat-spinner"></i>
                                <span className="state">Welcome back!</span>
                            </button>
                        </div>
                    </div>
                );

        }
    },
    render: function() {
        return this.renderState();
    }
});



var IncomingMessage = React.createClass({
    _onDownloadMessages: function(e){
        var message = FullImageStore.getFullImage(this.props.data.id);
        CoreUtils.downloadImage(message, 'Image viewing', 'chat-thumbnail.png');
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
                <a href="#" onClick={this._onDownloadMessages} >
                    <img className="image-message" src={ data.message } />
                </a>
            );
        }
    },
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                <i className="msg-badge">operator</i>
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
            <li>
                <div className="message-data">
                    <span className="message-data-name">
                        <i className={"fa fa-circle " + (this.props.status || 'offline')}></i>
                        {this.props.data.from || 'Not specified'}
                        {this.operatorStatus()}
                    </span>
                    <span className="message-data-time">
                        { CoreUtils.getCurrentTime(this.props.data.date)}, {'Today'}
                    </span>
                </div>
                <div className={"message my-message" + this._operatorMsgClasses()}>
                    { this.renderMessage(this.props.data) }
                </div>
            </li>
        );
    }
});


var IconButton = React.createClass({
    render: function() {
        return (
            <i onClick={this.props.onClick || function(){}} className={this.props.classes}></i>
        );
    }
});


var HistoryButton = React.createClass({
    render: function() {
        return (
            <button onClick={this.props.onClick} className={this.props.classes}>
                <i className={this.props.icons}></i>
                &nbsp;&nbsp;{this.props.title || ''}
            </button>
        );
    }
});


var HistoryBox = React.createClass({
    scroll: 0,
    renderMessage: function(message){
        var contact = this.props.contact;
        switch(message.messageType){
            case MessageTypes.INCOMING:
                if(message.firstUnread){
                    return (
                        <UnreadIncomingMessage ref="unreadItem"
                                               key={message.id}
                                               data={message}
                                               status={contact.status} />
                    )
                }
                return (
                    <IncomingMessage key={message.id}
                                     data={message}
                                     status={contact.status} />
                );
            case MessageTypes.OUTGOING:
                if(message.firstUnread){
                    return (
                        <UnreadOutgoingMessage ref="unreadItem"
                                               key={message.id}
                                               data={message}
                                               status={contact.status} />
                    )
                }
                return (
                    <OutgoingMessage key={message.id}
                                     data={message}
                                     status={contact.status}/>
                );
            case MessageTypes.END_OF_CONVERSATION:
                if(message.firstUnread){
                    return (
                        <UnreadEndConversationMessage ref="unreadItem"
                                                      key={message.id}
                                                      data={message}
                                                      status={contact.status} />
                    )
                }
                return (
                    <EndConversationMessage key={message.id}
                                            data={message}
                                            status={contact.status} />
                );

        }
    },
    _scrollToFirstUnread: function(){
        var BOTTOM_OFFSET = 50;
        var unreadItem = this.refs.unreadItem;
        var node = ReactDOM.findDOMNode(this);
        if(unreadItem && unreadItem.canScroll()){
            this.refs.unreadItem.scrollIntoViewIfNeeded(node, true);
            this.scroll = node.scrollHeight - BOTTOM_OFFSET;
        } else if (this.canScroll) {
            node.scrollTop = node.scrollHeight;
            this.scroll = node.scrollTop;
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
        this.canScroll = node.scrollTop >= this.scroll;
    },
    componentDidUpdate: function() {
        this._scrollToFirstUnread();
    },
    render: function() {
        var renderMessage = this.renderMessage;
        return (
            <div className="chat-history">
                <LoadMessageHistoryButton status={this.props.contact.loadStatus}
                                          onClick={this._onLoadHistory}
                                          title={"Load history"}
                                          titleLoading={"Loading..."}/>

                <ul className="chat-history-messages">
                    {
                        this.props.messages.map(function(message){
                            return renderMessage(message)
                        })
                    }
                </ul>
            </div>
        );
    }
});


var HeaderBox = React.createClass({
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
            <div className="chat-header clearfix">
                <div className="chat-about">
                    <div className="chat-with"> Chat with: {this.props.contact.name || ''}</div>
                    <div className="chat-num-messages">
                        already
                        <i className="msg-badge">{this.props.count || 0}</i>
                        messages
                    </div>
                </div>
                <IconButton onClick={this.closeClicked} classes="fa fa-times header-icon"/>
                <IconButton onClick={this._minimizeClicked} classes="fa fa-minus-square header-icon"/>
            </div>
        );
    }
});


var FooterBox = React.createClass({
    getInitialState: function() {
        return {
            value: ''
        };
    },
    sendMessage: function(e){
        if(this.state.value.trim() !== '') {
            var dt = new Date();
            var msg = {
                id: null,
                message: this.state.value,
                sender: this.props.operator,
                receiver: this.props.contact,
                contentType: MessageContentTypes.TEXT,
                messageType: MessageTypes.OUTGOING,
                date: dt,
                fullImage: null
            };
            ChatActions.outgoingMessage(msg);
            this.setState({value: ''});
        }
    },
    sendEndMessage: function(e){
        ChatActions.outgoingMessage(
            null,
            'End of conversation',
            this.props.operator,
            this.props.contact,
            MessageContentTypes.TEXT,
            MessageTypes.END_OF_CONVERSATION
        );
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
            sender: this.props.operator,
            receiver: this.props.contact,
            contentType: MessageContentTypes.IMAGE,
            messageType: MessageTypes.OUTGOING,
            date: dt,
            fullImage: fullBase64string
        };
        ChatActions.outgoingMessage(msg);
    },
    render: function() {
        return (
            <div className="chat-message clearfix">
                <textarea name="message-to-send"
                          id="message-to-send"
                          placeholder="Type your message"
                          value={this.state.value}
                          onChange={this.handleChange}
                          onKeyUp={this.handleKeyUp}
                          rows="2"/>
                <IconButton classes="fa fa-file-o"/>&nbsp;&nbsp;&nbsp;
                <UploadImageButton onImageBase64={this._onImageUpload} classes="fa fa-file-image-o"/>
                <HistoryButton onClick={this.sendMessage} title="send" icons="fa fa-paper-plane-o" classes="btn-send"/>
                <HistoryButton onClick={this.sendEndMessage} title="end" icons="fa fa-comments" classes="btn-replied"/>
            </div>
        );
    }
});


var EndConversationMessage = React.createClass({
    operatorStatus: function () {
        if (this.props.data.operator) {
            return (
                <i className="msg-badge">operator</i>
            );
        } else {
            return '';
        }
    },
    renderMessage: function(data){
        return (
            <div className="message-resolved"></div>
        );
    },
    render: function() {
        return (
            <li className="clearfix">
                <div className="message-data align-right">
                    <span className="message-data-time">
                        { CoreUtils.getCurrentTime(this.props.data.date)}, {'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">
                        {this.props.data.from || 'Empty sender'}
                        {this.operatorStatus()}
                    </span>
                    &nbsp;&nbsp;
                    <i className={"fa fa-circle " + (this.props.status || 'me')}></i>
                </div>

                { this.renderMessage(this.props.data) }

            </li>
        );
    }
});

var EmptyHeaderBox = React.createClass({
    _onMinimize: function(){
        if(typeof this.props.onMinimize == 'function'){
            this.props.onMinimize();
        }
    },
    render: function() {
        return (
            <div className="chat-header clearfix">
                <IconButton onClick={this._onMinimize} classes="fa fa-minus-square header-icon"/>
            </div>
        );
    }
});

var EmptyConversationBox = React.createClass({
    _onMinimize: function(){
        if(typeof this.props.onMinimize == 'function'){
            this.props.onMinimize();
        }
    },
    render: function() {
        return (
            <div className="chat">
                <EmptyHeaderBox onMinimize={this._onMinimize}/>
                <EmptyChatBox/>
            </div>
        );
    }
});

var EmptyChatBox = React.createClass({
    render: function() {
        return (
            <div className="wrapper no-conversation">
                <div><i className="fa fa-4x fa-comment"></i></div>
                <span className="state">No conversation</span>
            </div>
        )
    }
});

var ConversationBox = React.createClass({
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
            <div className="chat">
                <HeaderBox contact={this.props.contact} count={this.props.messages.length}
                           onClose={this._onClose}
                           onMinimize={this._onMinimize}/>
                <HistoryBox contact={this.props.contact} messages={this.props.messages}
                            onLoadHistory={this._onLoadHistory}/>
                <FooterBox operator={this.props.operator} contact={this.props.contact} onMessage={this._onOutMessage}/>
            </div>
        );
    }
});


var ContactsListBox = React.createClass({
    onActivateContact: function(contact){
        if(typeof this.props.onSelectContact == 'function'){
            this.props.onSelectContact(contact);
        }
    },
    render: function() {
        var selectedId = this.props.current ? this.props.current.name : null;
        var onActivateContact = this.onActivateContact;
        return (
            <ul className="list">
                {
                    this.props.items.map(function(contact){
                        return (
                            <Contact key={contact.id}
                                     data={contact}
                                     selectedId={selectedId}
                                     onActivate={onActivateContact}/>
                        )
                    })
                }
            </ul>
        );
    }
});

var ContactSearchBox = React.createClass({
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
            <div className="search">
                <input className="search-input"
                       onChange={this._handleChange}
                       onKeyUp={this._handleKeyUp}
                       type="text" placeholder="search" value={this.state.value}/>
                <i onClick={this._onSearch} className="fa fa-search"></i>
                <i onClick={this._onClear} className="fa fa-close"></i>
            </div>
        );
    }
});



var ContactsBox = React.createClass({
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
            <div className="people-list" id="people-list">
                <ContactSearchBox onLiveSearch={this._onLiveSearch}
                                  onSearch={this._onSearch}
                                  onClear={this._onClear}/>
                <ContactsListBox items={this.props.contacts}
                                 current={this.props.current}
                                 onSelectContact={this._onSelectContact}/>
            </div>
        );
    }
});

var Contact = React.createClass({
    getInitialState: function() {
        var unreadCount = UnreadMessageStore.getCount(this.props.data.name);
        var participants = ParticipantsStore.getParticipants(this.props.data.name);
        return {
            data: this.props.data || {},
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
        var unread = UnreadMessageStore.getCount(this.state.data.name);
        this.setState({
            unread: unread
        });
    },

    _participantsChange: function(){
        var data = ParticipantsStore.getParticipants(this.state.data.name);
        if(data.length > 0) {
            this.setState({
                participants: data
            });
        }
    },
    _getParticipants: function(){
        if(this.state.participants) {
            return (
                <span>
                {
                    this.state.participants.map(function (name, index) {
                        return (
                            <span key={index} className="msg-badge badge-sm">{name}</span>
                        );
                    })
                }
                </span>
            );

        }
        return '';
    },
    activateContact: function(){
        if(typeof this.props.onActivate == 'function'){
            this.props.onActivate(this.state.data);
        }
    },
    getUnreadMessageCount: function(){
        if(this.state.unread || 0 > 0) {
            return (
                <i className="msg-badge unread">{this.state.unread || 0}</i>
            )
        }
        return '';
    },
    clientActive: function(){
        var contact = this.state.data;
        if(this.props.selectedId == contact.name){
            return ' active';
        }
        return '';
    },
    render: function() {
        return (
            <li className={"contact clearfix" + this.clientActive() }  onClick={this.activateContact}>
                <div className="about">
                    <div className="name">{this.state.data.name || '+000000000000'}</div>
                    <div className="status">
                        <i className={"fa fa-circle " + this.state.data.status || 'offline' }></i>
                        {this.state.data.status || 'offline'}
                    </div>
                    <div>
                        {this._getParticipants()}
                    </div>
                    <div className="msg-unread">
                        {this.getUnreadMessageCount()}
                    </div>
                </div>
            </li>
        );
    }
});

var ChatBox = React.createClass({
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
        ContactsStore.addChangeListener(this._storeContactsChange);
        ContactsStore.addContactSelectListener(this._storeContactSelect);
        MessageStore.addUpdateListener(this._storeMessagesChange);
    },

    componentWillUnmount: function() {
        ContactsStore.removeChangeListener(this._storeContactsChange);
        ContactsStore.removeContactSelectListener(this._storeContactSelect);
        MessageStore.removeUpdateListener(this._storeMessagesChange);
    },

    _onSelectContact: function(contact){
        ChatActions.clickContact(contact.name);
        ChatActions.readMessages(contact.name);
    },

    _storeContactSelect: function(){
        var contact = ContactsStore.getCurrentContact();
        this.setState({
            chatState: 'chat',
            currentContact: contact
        });
    },

    _storeContactsChange: function(){
        this.setState({
            chatState: 'no-chat',
            currentContact: {},
            messages: [],
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
        ChatActions.fetchContactHistory(contact);
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
                    <MinChatBox onMaximize={this._onMaximize}
                                status={this.state.operator.status}/>
                );
            case 'login':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <LoginBox onAuthSuccess={this.authSuccess}/>
                    </div>
                );
            case 'chat':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <ContactsBox current={this.state.currentContact}
                                     contacts={this.state.contacts}
                                     onSelectContact={this._onSelectContact}/>
                        <ConversationBox contact={this.state.currentContact}
                                         operator={this.state.operator}
                                         messages={this.state.messages}
                                         onClose={this.onConversationClose}
                                         onMinimize={this._onMinimize}
                                         onOutgoingMessage={this.onOutgoingMessage}
                                         onLoadHistory={this._onLoadHistory} />
                    </div>
                );
            case 'no-chat':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <ContactsBox  contacts={this.state.contacts} onSelectContact={this._onSelectContact}/>
                        <EmptyConversationBox onMinimize={this._onMinimize}/>
                    </div>
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
    <ChatBox />,
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
                    FullImageStore: FullImageStore,
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
