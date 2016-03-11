var ChatDispatcher = new Flux.Dispatcher();

var _lastMessageId = 1;
//TODO: clear after testing
var _messages = {
    '+996555111222': {
        messages:{},
        unreadIds: [],
        firstUnreadMsgId: null
    },
    '+996255111223': {
        messages:{},
        unreadIds: [],
        firstUnreadMsgId: null
    },
    '+996355111224': {
        messages:{},
        unreadIds: [],
        firstUnreadMsgId: null
    },
    '+996455111225': {
        messages:{},
        unreadIds: [],
        firstUnreadMsgId: null
    },
    '+996655111226': {
        messages:{},
        unreadIds: [],
        firstUnreadMsgId: null
    },
    '+996755111227': {
        messages:{},
        unreadIds: [],
        firstUnreadMsgId: null
    }
};

//TODO: clear after testing
var _contacts = {
    '+996555111222': {
        id: 'c_1',
        name: '+996555111222',
        status: 'online',
        scrollTop: 0
    },
    '+996255111223': {
        id: 'c_2',
        name: '+996255111223',
        status: 'offline',
        scrollTop: 0
    },
    '+996355111224': {
        id: 'c_3',
        name: '+996355111224',
        status: 'online',
        scrollTop: 0
    },
    '+996455111225': {
        id: 'c_4',
        name: '+996455111225',
        status: 'offline',
        scrollTop: 0
    },
    '+996655111226': {
        id: 'c_5',
        name: '+996655111226',
        status: 'online',
        scrollTop: 0
    },
    '+996755111227': {
        id: 'c_6',
        name: '+996755111227',
        status: 'online',
        scrollTop: 0
    }
};

var _activeContactId,
    _preActiveContactId,
    _contactFilterPattern = '';

/*============================ Constants =================================*/
var ChatConstants = {
    MESSAGE_CHANGE_EVENT: 'MESSAGE_CHANGED_EVENT',
    CONTACT_SELECT_EVENT: 'CONTACT_SELECT_EVENT',
    MESSAGE_UPDATE_EVENT: 'MESSAGE_UPDATE_EVENT',
    CONTACTS_CHANGE_EVENT: 'CONTACTS_CHANGE_EVENT'
};

var ActionTypes = {
    CLICK_CONTACT: 'CLICK_CONTACT',
    RECEIVE_RAW_MESSAGES: 'RECEIVE_RAW_MESSAGES',
    NEW_OUT_MESSAGE: 'NEW_OUT_MESSAGE',
    NEW_IN_MESSAGE: 'NEW_IN_MESSAGE',
    READ_MESSAGE: 'READ_MESSAGE',
    CONTACT_MESSAGES_SCROLL: 'CONTACT_MESSAGES_SCROLL',
    CONTACT_FILTER: 'CONTACT_FILTER'
};

var KeyConstants = {
    ENTER_KEY: 13
};

/*============================ Store =================================*/
var UnreadChatMessageStore = objectAssign({}, EventEmitter.prototype, {

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

    getCount: function(id) {
        var messages = ChatMessageStore.getUnreadMessageIds(id);
        return messages.length;
    }
});

var ChatMessageStore = objectAssign({}, EventEmitter.prototype, {
    init: function(rawMessages){
        _messages = rawMessages;
    },
    getAll: function(){
        return _messages;
    },
    getMessages: function(id){
        if(!id){
            return [];
        }
        var MessageStoreItem = {
            messages: {},
            unreadIds: [],
            firstUnreadMsgId: null
        };
        if(!_messages[id]){
            _messages[id] = MessageStoreItem;
        }

        var result = [];
        var messages = _messages[id].messages;

        for(var msgId in messages){
            result.push(messages[msgId]);
        }

        return result;
    },

    addMessage: function(id, message, activeId){
        message.isRead = (activeId == id);
        if(!message.isRead){
            _messages[id].unreadIds.push(message.id);
            if(_messages[id].firstUnreadMsgId == null){
                _messages[id].firstUnreadMsgId = message.id;
            }
        }
        _messages[id].messages[message.id] = message;
    },

    getUnreadMessageIds: function(id){
        var MessageStoreItem = {
            messages: {},
            unreadIds: [],
            firstUnreadMsgId: null
        };
        if(!_messages[id]){
            _messages[id] = MessageStoreItem;
        }
        return _messages[id].unreadIds;
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
            name: data.operator.name,
            message: data.data.message,
            contentType: data.type,
            msgType: 'out',
            operator: true,
            datetime: CoreUtils.formatDate(new Date()),
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

        for(var i = 0, len = unreadIds.length; i < len; i++){
            var message = messages[unreadIds[i]];
            if(i == 0){
                message.firstUnread = true;
                _messages[id].firstUnreadMsgId = message.id;
            }
            message.isRead = true;
        }

        _messages[id].unreadIds = [];
    }
});

var ChatContactsStore = objectAssign({}, EventEmitter.prototype, {
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
        _preActiveContactId = _activeContactId;
        _activeContactId = id;
        if(!_preActiveContactId) {
            _preActiveContactId = _activeContactId;
        }
    }
});

/*============================ Dispatchers =================================*/
ChatContactsStore.dispatchToken = ChatDispatcher.register(function(action) {
    switch (action.type) {
        case ActionTypes.CLICK_CONTACT:
            ChatContactsStore.setActive(action.contactId);
            ChatContactsStore.emitContactSelect();
            break;

        case ActionTypes.CONTACT_MESSAGES_SCROLL:
            _contacts[action.contactId].scrollTop = action.scrollTopValue;
            ChatContactsStore.emitChange();
            break;

        case ActionTypes.CONTACT_FILTER:
            ChatContactsStore.setFilter(action.pattern);
            ChatContactsStore.emitChange();
            break;

        default:
        // do nothing
    }
});


ChatMessageStore.dispatchToken = ChatDispatcher.register(function(action) {
    ChatDispatcher.waitFor([
        ChatContactsStore.dispatchToken
    ]);

    var message = null;
    var activeContactId;
    var unreadIndex = -1;
    switch(action.type) {
        case ActionTypes.CLICK_CONTACT:
            ChatMessageStore.unmarkFirstRead(action.prevContactId);
            ChatMessageStore.emitUpdate();
            ChatMessageStore.emitChange();
            break;
        case ActionTypes.READ_MESSAGE:
            ChatMessageStore.readMessages(action.contactId);
            UnreadChatMessageStore.emitChange();

            break;
        case ActionTypes.NEW_OUT_MESSAGE:
            message = CoreUtils.createOutMessageFromRaw(
                action.message,
                action.sender,
                action.receiver,
                action.msgType
            );
            activeContactId = ChatContactsStore.getActive();
            ChatMessageStore.addMessage(action.receiver.name, message, activeContactId);
            if(action.receiver.name == activeContactId) {
                ChatMessageStore.emitUpdate();
            }
            ChatMessageStore.emitChange();
            break;
        case ActionTypes.NEW_IN_MESSAGE:
            message = CoreUtils.createInMessageFromRaw(
                action.message,
                action.sender,
                action.receiver,
                action.msgType,
                action.datetime
            );
            activeContactId = ChatContactsStore.getActive();
            ChatMessageStore.addMessage(action.sender, message, activeContactId);
            if(action.sender == activeContactId) {
                ChatMessageStore.emitUpdate();
            }
            ChatMessageStore.emitChange();
            break;

        case ActionTypes.RECEIVE_RAW_MESSAGES:
            ChatMessageStore.init(action.rawMessages);
            ChatMessageStore.emitChange();
            break;

        case ActionTypes.CONTACT_FILTER:
            if(_preActiveContactId) {
                unreadIndex = _messages[_preActiveContactId].firstUnreadMsgId;
                if(unreadIndex != null) {
                    _messages[_preActiveContactId].messages[unreadIndex].firstUnread = false;
                    _messages[_preActiveContactId].firstUnreadMsgId = null;
                }
            }

        default:
        // do nothing
    }

});


UnreadChatMessageStore.dispatchToken = ChatDispatcher.register(function(action) {
    ChatDispatcher.waitFor([
        ChatContactsStore.dispatchToken,
        ChatMessageStore.dispatchToken
    ]);

    switch (action.type) {
        case ActionTypes.READ_MESSAGE:
            UnreadChatMessageStore.emitChange();
            break;
        case ActionTypes.NEW_OUT_MESSAGE:
            UnreadChatMessageStore.emitChange();
            break;
        case ActionTypes.NEW_IN_MESSAGE:
            UnreadChatMessageStore.emitChange();
            break;
        case ActionTypes.CLICK_CONTACT:
            UnreadChatMessageStore.emitChange();
            break;

        case ActionTypes.RECEIVE_RAW_MESSAGES:
            UnreadChatMessageStore.emitChange();
            break;

        default:
        // do nothing
    }
});

/*============================= Actions ==============================*/

var OutgoingMessageAction = {
    createMessage: function (message, sender, receiver, msgType) {
        ChatDispatcher.dispatch({
            type: ActionTypes.NEW_OUT_MESSAGE,
            message: message,
            sender: sender,
            receiver: receiver,
            msgType: msgType
        });
        var msg = CoreUtils.createOutMessageFromRaw(
            message, sender, receiver, msgType);
        //Отправка на сервер
    }
};

var IncomingMessageAction = {
    createMessage: function (message, sender, receiver, msgType, datetime) {
        ChatDispatcher.dispatch({
            type: ActionTypes.NEW_IN_MESSAGE,
            message: message,
            sender: sender,
            receiver: receiver,
            msgType: msgType,
            datetime: datetime
        });
        var msg = CoreUtils.createInMessageFromRaw(
            message, sender, receiver, msgType);
        //Отправка на сервер
    }
};

var ReadMessageAction = {
    createAction: function (contactId) {
        ChatDispatcher.dispatch({
            type: ActionTypes.READ_MESSAGE,
            contactId: contactId
        });
    }
};

var ClickContactAction = {
    createAction: function (contactId) {
        ChatDispatcher.dispatch({
            type: ActionTypes.CLICK_CONTACT,
            prevContactId: _preActiveContactId,
            contactId: contactId
        });
    }
};

var MessagesScrollAction = {
    createAction: function (contactId, scrollTopValue) {
        ChatDispatcher.dispatch({
            type: ActionTypes.CONTACT_MESSAGES_SCROLL,
            contactId: contactId,
            scrollTopValue: scrollTopValue
        });
    }
};

var FilterMessageAction = {
    createAction: function (pattern) {
        ChatDispatcher.dispatch({
            type: ActionTypes.CONTACT_FILTER,
            pattern: pattern
        });
    }
};
/*============================= Utils ==============================*/

var CoreUtils = {
    padLeft: function(num, base,chr){
        var  len = (String(base || 10).length - String(num).length)+1;
        return len > 0? new Array(len).join(chr || '0')+num : num;
    },
    formatDate: function(d){
        return [
                d.getFullYear(),
                CoreUtils.padLeft(d.getMonth() + 1),
                CoreUtils.padLeft(d.getDate())].join('-') +
            ' ' + [
                CoreUtils.padLeft(d.getHours()),
                CoreUtils.padLeft(d.getMinutes()),
                CoreUtils.padLeft(d.getSeconds())
            ].join(':');
    },
    createOutMessageFromRaw: function(message, sender, receiver, msgType){
        _lastMessageId++;
        return {
            id: 'm_' + _lastMessageId,
            name: sender.name,
            message: message,
            contentType: msgType,
            msgType: 'out',
            operator: true,
            datetime: CoreUtils.formatDate(new Date()),
            isRead: true
        };
    },

    createInMessageFromRaw: function(message, sender, receiver, msgType, datetime){
        _lastMessageId++;
        return {
            id: 'm_' + _lastMessageId,
            name: sender,
            message: message,
            contentType: msgType,
            msgType: 'in',
            operator: false,
            datetime: CoreUtils.formatDate(new Date(datetime)),
            isRead: false
        };
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
    inViewport: function(parent, node, centerIfNeeded){
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
            changed = true;
        }

        if ((overLeft || overRight) && centerIfNeeded) {
            changed = true;
        }

        if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded) {
            changed = true;
        }
        return changed;
    }
};

/*=============================== React ================================*/

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

var EndConversationMessage = React.createClass({
    render: function() {
        var getCurrentTime = function () {
            return new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };
        return (
            <li className="clearfix message-resolved">
                <div className="message-data align-right">
                    <span className="message-data-time">
                        {this.props.time || getCurrentTime()}, {this.props.days || 'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">{this.props.name || 'Not specified' }
                        <i className="msg-badge">operator</i>
                    </span>
                    <i className="fa fa-circle me"></i>
                </div>
                <div className="message other-message float-right">
                    <i className="fa fa-check-circle green-icon"></i>&nbsp;&nbsp;
                    {this.props.message || 'End conversation'}
                </div>
            </li>
        );
    }
});

var UnreadMessageDelimeter = React.createClass({
    render: function() {
        return (
            <li className="clearfix messages-unread">
                <span className="mark">New messages</span>
            </li>
        );
    }
});


var UnreadIncomingMessage = React.createClass({
    scrolled: false,
    renderMessage: function(data){
        if(data.contentType == 'text'){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == 'image'){
            return (
                <img className="image-message" src={ data.message } />
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
    render: function() {
        var getCurrentTime = function (dt) {
            var resultDate = new Date(dt) || new Date();
            return resultDate.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };

        return (
            <li className="message-container messages-unread">
                <span className="mark">New messages</span>
                <div className="message-data">
                    <span className="message-data-name">
                        <i className={"fa fa-circle " + (this.props.status || 'offline')}></i>
                        {this.props.data.name || 'Not specified'}
                    </span>
                    <span className="message-data-time">
                        {getCurrentTime(this.props.data.datetime) || getCurrentTime()}, {'Today'}
                    </span>
                </div>
                <div className="message my-message">
                    { this.renderMessage(this.props.data) }
                </div>
            </li>
        );
    }
});

var UnreadOutgoingMessage = React.createClass({
    renderMessage: function(data){
        if(data.contentType == 'text'){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == 'image'){
            return (
                <img className="image-message" src={ data.message } />
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
        var getCurrentTime = function (dt) {
            var resultDate = new Date(dt) || new Date();
            return resultDate.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };

        return (
            <li className="message-container clearfix messages-unread">
                <span className="mark">New messages</span>
                <div className="message-data align-right">
                    <span className="message-data-time">
                        {getCurrentTime(this.props.data.datetime) || getCurrentTime()}, {'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">
                        {this.props.data.name || 'Empty sender'}
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


var IncomingMessage = React.createClass({
    renderMessage: function(data){
        if(data.contentType == 'text'){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == 'image'){
            return (
                <img className="image-message" src={ data.message } />
            );
        }
    },
    render: function() {
        var getCurrentTime = function (dt) {
            var resultDate = new Date(dt) || new Date();
            return resultDate.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };

        return (
            <li>
                <div className="message-data">
                    <span className="message-data-name">
                        <i className={"fa fa-circle " + (this.props.status || 'offline')}></i>
                        {this.props.data.name || 'Not specified'}
                    </span>
                    <span className="message-data-time">
                        {getCurrentTime(this.props.data.datetime) || getCurrentTime()}, {'Today'}
                    </span>
                </div>
                <div className="message my-message">
                    { this.renderMessage(this.props.data) }
                </div>
            </li>
        );
    }
});

var OutgoingMessage = React.createClass({
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
        if(data.contentType == 'text'){
            return (
                data.message || 'Empty message'
            );
        } else if(data.contentType == 'image'){
            return (
                <img className="image-message" src={ data.message } />
            );
        }
    },
    render: function() {
        var getCurrentTime = function (dt) {
            var resultDate = new Date(dt) || new Date();
            return resultDate.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };

        return (
            <li className="clearfix">
                <div className="message-data align-right">
                    <span className="message-data-time">
                        {getCurrentTime(this.props.data.datetime) || getCurrentTime()}, {'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">
                        {this.props.data.name || 'Empty sender'}
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

var HeaderBox = React.createClass({
    closeClicked: function(e){
        if(typeof this.props.onClose == 'function') {
            this.props.onClose();
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
                <IconButton classes="fa fa-minus-square header-icon"/>
            </div>
        );
    }
});

var EmptyHeaderBox = React.createClass({
    render: function() {
        return (
            <div className="chat-header clearfix">
                <IconButton classes="fa fa-minus-square header-icon"/>
            </div>
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

var UploadImageButton = React.createClass({
    getCoefficient: function(width, height, limit){
        var maxHW = Math.max(width, height);
        var coefficient = 1;
        if(maxHW > limit){
            coefficient = maxHW / limit;
        }
        return coefficient;
    },
    _onUploadedBase64: function(b64string){
        if(this.props.onImageBase64) {
            this.props.onImageBase64(b64string);
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
                var coefficient = self.getCoefficient(self.img.width, self.img.height, 1280);
                canvas.width = self.img.width / coefficient;
                canvas.height = self.img.height / coefficient;

                var ctx = canvas.getContext("2d");
                ctx.drawImage(self.img,0,0,canvas.width, canvas.height);
                var fullb64string = canvas.toDataURL("image/png");

                coefficient = self.getCoefficient(self.img.width, self.img.height, 150);
                canvas.width = self.img.width / coefficient;
                canvas.height = self.img.height / coefficient;

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

var FooterBox = React.createClass({
    getInitialState: function() {
        return {
            value: ''
        };
    },
    sendMessage: function(e){
        if(this.state.value.trim() !== '') {
            OutgoingMessageAction.createMessage(
                this.state.value,
                this.props.operator,
                this.props.contact,
                'text'
            );
            this.setState({value: ''});
        }
    },
    handleChange: function(event){
        this.setState({value: event.target.value});
    },
    handleKeyUp: function(event){
        if (event.keyCode === KeyConstants.ENTER_KEY) {
            this.sendMessage();
        }
    },
    _onImageUpload: function(b64string){
        OutgoingMessageAction.createMessage(
            b64string,
            this.props.operator,
            this.props.contact,
            'image'
        );
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
                          rows="3"/>
                <IconButton classes="fa fa-file-o"/>&nbsp;&nbsp;&nbsp;
                <UploadImageButton onImageBase64={this._onImageUpload} classes="fa fa-file-image-o"/>
                <HistoryButton onClick={this.sendMessage} title="send" icons="fa fa-paper-plane-o" classes="btn-send"/>
                <HistoryButton title="end" icons="fa fa-comments" classes="btn-replied"/>
            </div>
        );
    }
});

var HistoryBox = React.createClass({
    scroll: 0,
    renderMessage: function(message){
        var contact = this.props.contact;
        switch(message.msgType){
            case 'in':
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
            case 'out':
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
                )
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

var Contact = React.createClass({
    getInitialState: function() {
        var unreadCount = UnreadChatMessageStore.getCount(this.props.data.name);
        return {
            data: this.props.data || {},
            active: false,
            unread: unreadCount
        }
    },

    componentDidMount: function() {
        UnreadChatMessageStore.addChangeListener(this._onUnreadChange);
    },

    componentWillUnmount: function() {
        UnreadChatMessageStore.removeChangeListener(this._onUnreadChange);
    },

    _onUnreadChange: function(){
        var unread = UnreadChatMessageStore.getCount(this.state.data.name);
        this.setState({
            unread: unread
        });
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
                    <div className="msg-unread">
                        {this.getUnreadMessageCount()}
                    </div>
                </div>
            </li>
        );
    }
});

var ContactsListBox = React.createClass({
    onActivateContact: function(contact){
        ClickContactAction.createAction(contact.name);
        ReadMessageAction.createAction(contact.name);
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
        FilterMessageAction.createAction(pattern);
    },
    _onClear: function(){
        FilterMessageAction.createAction("");
    },
    _onLiveSearch: function(pattern){
        FilterMessageAction.createAction(pattern);
    },
    render: function() {
        return (
            <div className="people-list" id="people-list">
                <ContactSearchBox onLiveSearch={this._onLiveSearch}
                                  onSearch={this._onSearch}
                                  onClear={this._onClear}/>
                <ContactsListBox items={this.props.contacts} current={this.props.current} onSelectContact={this.props.onSelectClient}/>
            </div>
        );
    }
});

var ConversationBox = React.createClass({
    _onClose: function(){
        if(typeof this.props.onClose == 'function'){
            this.props.onClose();
        }
    },
    _onOutMessage: function(message){
        if (typeof this.props.onOutgoingMessage == 'function'){
            this.props.onOutgoingMessage(message);
        }
    },
    render: function() {
        return (
            <div className="chat">
                <HeaderBox contact={this.props.contact} count={this.props.messages.length} onClose={this._onClose}/>
                <HistoryBox contact={this.props.contact} messages={this.props.messages} />
                <FooterBox operator={this.props.operator} contact={this.props.contact} onMessage={this._onOutMessage}/>
            </div>
        );
    }
});

var EmptyConversationBox = React.createClass({
    render: function() {
        return (
            <div className="chat">
                <EmptyHeaderBox/>
                <EmptyChatBox/>
            </div>
        );
    }
});

var LoginBox = React.createClass({
    getInitialState: function() {
        return {loginState: this.props.initialLoginState || 'login'};
    },
    progressState: function(){
        this.setState({
            loginState: 'progress'
        });
    },
    successState: function(){
        this.setState({
            loginState: 'success'
        });
    },
    tryAgainState: function(){
        this.setState({
            loginState: 'login'
        });
    },
    authenticateOperator: function(){
        setTimeout(function() {
            this.successState();
            setTimeout(function() {
                if(typeof this.props.onAuthSuccess == 'function') {
                    this.props.onAuthSuccess();
                }
            }.bind(this), 1000); //4000
        }.bind(this), 1500); //3000
    },
    loginClick: function(e){
        this.progressState();
        this.authenticateOperator();
    },
    renderState: function(){
        switch(this.state.loginState){
            case 'login':
                return (
                    <div className="wrapper">
                        <button className="login-btn" onClick={this.loginClick}>
                            <i className="chat-spinner"></i>
                            <span className="state">Log in</span>
                        </button>
                    </div>
                );
            case 'progress':
                return (
                    <div className="wrapper loading">
                        <button className="login-btn">
                            <i className="chat-spinner"></i>
                            <span className="state">Authenticating</span>
                        </button>
                    </div>
                );
            case 'success':
                return (
                    <div className="wrapper ok loading">
                        <button className="login-btn">
                            <i className="chat-spinner"></i>
                            <span className="state">Welcome back!</span>
                        </button>
                    </div>
                );

        }
    },
    render: function() {
        return (
            <div className="chat">
                {this.renderState()}
            </div>
        )
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

var ChatBox = React.createClass({
    getInitialState: function() {
        return {
            chatState: this.props.initialChatState || 'login',
            contacts: [],
            messages: [],
            currentContact: {},
            operator: {
                name: 'Ксения Оператор'
            },
            unread: 0
        };
    },

    componentDidMount: function() {
        ChatContactsStore.addChangeListener(this._onContactsChange);
        ChatContactsStore.addContactSelectListener(this._onContactSelect);
        ChatMessageStore.addUpdateListener(this._onMessagesChange);
    },

    componentWillUnmount: function() {
        ChatContactsStore.removeChangeListener(this._onContactsChange);
        ChatContactsStore.removeContactSelectListener(this._onContactSelect);
        ChatMessageStore.removeUpdateListener(this._onMessagesChange);
    },

    _onContactSelect: function(){
        this.selectClient(ChatContactsStore.getCurrentContact());
    },

    _onContactsChange: function(){
        this.setState({
            chatState: 'no-chat'
        });
        this.loadContacts();
    },

    _onMessagesChange: function(){
        this.loadMessages(ChatContactsStore.getCurrentContact());
    },

    loadContacts: function(){
        this.setState({
            currentContact: {},
            messages: [],
            contacts: ChatContactsStore.getAll()
        });
    },
    loadMessages: function(contact){
        this.setState({
            messages: ChatMessageStore.getMessages(contact.name)
        });
    },
    authSuccess: function(){
        this.setState({
            chatState: 'no-chat'
        });
        this.loadContacts();
        //TODO: Tests
        RunIncomingMessages();
    },
    selectClient: function(client){
        this.setState({
            chatState: 'chat',
            currentContact: client,
            messages: []
        });
    },
    onConversationClose: function(){
        this.setState({
            chatState: 'no-chat',
            messages:[],
            currentContact: {}
        });
    },
    onOutgoingMessage: function(data){
        var operator = this.state.operator;
        var currentContact = this.state.currentContact;
        ChatMessageStore.addOutMessage({
            contact: currentContact,
            operator: operator,
            data: data,
            type: 'text'
        });
    },
    renderState: function(){
        switch(this.state.chatState || 'login'){
            case 'login':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <LoginBox onAuthSuccess={this.authSuccess}/>
                    </div>
                );
            case 'chat':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <ContactsBox current={this.state.currentContact} contacts={this.state.contacts} onSelectClient={this.selectClient}/>
                        <ConversationBox contact={this.state.currentContact}
                                         operator={this.state.operator}
                                         messages={this.state.messages}
                                         onClose={this.onConversationClose}
                                         onOutgoingMessage={this.onOutgoingMessage} />
                    </div>
                );
            case 'no-chat':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <ContactsBox  contacts={this.state.contacts} onSelectClient={this.selectClient}/>
                        <EmptyConversationBox/>
                    </div>
                )
        }
    },
    render: function() {
        return this.renderState();
    }
});

/*============================ Main rendering =================================*/

var chatBox = ReactDOM.render(
    <ChatBox />,
    document.getElementById('chatbox')
);

function RunIncomingMessages(){
    var messageResponses = [
        'Why did the web developer leave the restaurant? Because of the table layout.',
        'How do you comfort a JavaScript bug? You console it.',
        'An SQL query enters a bar, approaches two tables and asks: "May I join you?"',
        'What is the most used language in programming? Profanity.',
        'What is the object-oriented way to become wealthy? Inheritance.',
        'An SEO expert walks into a bar, bars, pub, tavern, public house, Irish pub, drinks, beer, alcohol'
    ];
    var contentType = ['text', 'text', 'image'];

    function getRandomItem (arr) {
        var keys = Object.keys(arr);
        var count = keys.length;
        return arr[keys[Math.floor(Math.random() * count)]];
    }

    var index = 0;
    setInterval(function(){
        var contact = getRandomItem(_contacts);
        var date = CoreUtils.formatDate(new Date());

        var currentContentType = getRandomItem(contentType);
        if(currentContentType == 'text') {

            IncomingMessageAction.createMessage(
                getRandomItem(messageResponses),
                contact.name,
                '',
                'text',
                date);

        } else if(currentContentType == 'image') {
            IncomingMessageAction.createMessage(
                getRandomItem(ImageMessages),
                contact.name,
                '',
                'image',
                date);
        }

        index++;
    }, 2000);
}