var ChatDispatcher = new Flux.Dispatcher();

var _lastMessageId = 1;
//TODO: clear after testing
var _messages = {
    'c_1': {
        messages:[],
        lastMessage: {
            isRead: false
        },
        firstUnreadMsgIndex: null
    },
    'c_2': {
        messages:[],
        lastMessage: {
            isRead: false
        },
        firstUnreadMsgIndex: null
    },
    'c_3': {
        messages:[],
        lastMessage: {
            isRead: false
        },
        firstUnreadMsgIndex: null
    },
    'c_4': {
        messages:[],
        lastMessage: {
            isRead: false
        },
        firstUnreadMsgIndex: null
    },
    'c_5': {
        messages:[],
        lastMessage: {
            isRead: false
        },
        firstUnreadMsgIndex: null
    },
    'c_6': {
        messages:[],
        lastMessage: {
            isRead: false
        },
        firstUnreadMsgIndex: null
    }
};
//TODO: clear after testing
var _contactsIds = {
    '+996555111222': 'c_1',
    '+996255111223': 'c_2',
    '+996355111224': 'c_3',
    '+996455111225': 'c_4',
    '+996655111226': 'c_5',
    '+996755111227': 'c_6'
};

var _contactIndex = {
    'c_1':0,
    'c_2':1,
    'c_3':2,
    'c_4':3,
    'c_5':4,
    'c_6':5
};

//TODO: clear after testing
var _contacts = [
    {
        id: 'c_1',
        name: '+996555111222',
        status: 'online',
        scrollTop: 0
    },
    {
        id: 'c_2',
        name: '+996255111223',
        status: 'offline',
        scrollTop: 0
    },
    {
        id: 'c_3',
        name: '+996355111224',
        status: 'online',
        scrollTop: 0
    },
    {
        id: 'c_4',
        name: '+996455111225',
        status: 'offline',
        scrollTop: 0
    },
    {
        id: 'c_5',
        name: '+996655111226',
        status: 'online',
        scrollTop: 0
    },
    {
        id: 'c_6',
        name: '+996755111227',
        status: 'online',
        scrollTop: 0
    }
];

var _activeContactId,
    _preActiveContactId;

/*============================ Constants =================================*/
var ChatConstants = {
    CONTACT_CHANGE_EVENT: 'CONTACT_CHANGED_EVENT',
    MESSAGE_CHANGE_EVENT: 'MESSAGE_CHANGED_EVENT',
    CONTACT_SELECT_EVENT: 'CONTACT_SELECT_EVENT',
    MESSAGE_UPDATE_EVENT: 'MESSAGE_UPDATE_EVENT'
};

var ActionTypes = {
    CLICK_CONTACT: 'CLICK_CONTACT',
    RECEIVE_RAW_MESSAGES: 'RECEIVE_RAW_MESSAGES',
    NEW_OUT_MESSAGE: 'NEW_OUT_MESSAGE',
    NEW_IN_MESSAGE: 'NEW_IN_MESSAGE',
    READ_MESSAGE: 'READ_MESSAGE',
    CONTACT_MESSAGES_SCROLL: 'CONTACT_MESSAGES_SCROLL'
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
        if (ChatMessageStore.isReaded(id)) {
            return 0;
        }
        var messages = ChatMessageStore.getMessages(id);
        var unreadCount = 0;
        for (var i = messages.length-1; i >= 0; i--) {
            if (messages[i].isRead) {
                break;
            }
            unreadCount++;
        }
        return unreadCount;
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
        var MessageStoreItem = {
            messages:[],
            firstUnreadMsgIndex: null,
            lastMessage: {
                read: false
            }
        };
        if(!_messages[id]){
            _messages[id] = MessageStoreItem;
        }
        return _messages[id].messages;
    },

    isReaded: function(id){
        return _messages[id].lastMessage.isRead;
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
        _messages[data.contact.id].messages.push(message);
        this.emitChange();
    }
});

var ChatContactsStore = objectAssign({}, EventEmitter.prototype, {
    getAll: function(){
        return _contacts;
    },

    emitChange: function() {
        this.emit(ChatConstants.CONTACT_CHANGE_EVENT);
    },

    emitContactSelect: function() {
        this.emit(ChatConstants.CONTACT_CHANGE_EVENT);
    },

    /**
     * @param {function} callback
     */
    addChangeListener: function(callback) {
        this.on(ChatConstants.CONTACT_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    addContactSelectListener: function(callback) {
        this.on(ChatConstants.CONTACT_CHANGE_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeChangeListener: function(callback) {
        this.removeListener(ChatConstants.CONTACT_SELECT_EVENT, callback);
    },

    /**
     * @param {function} callback
     */
    removeContactSelectListener: function(callback) {
        this.removeListener(ChatConstants.CONTACT_SELECT_EVENT, callback);
    },

    getId: function(name){
        return _contactsIds[name];
    },

    getActive: function(){
        return _activeContactId;
    },

    getCurrentContact: function(){
        var index = _contactIndex[_activeContactId];
        return _contacts[index];
    }
});

/*============================ Dispatchers =================================*/
ChatContactsStore.dispatchToken = ChatDispatcher.register(function(action) {
    switch (action.type) {
        case ActionTypes.CLICK_CONTACT:
            _preActiveContactId = _activeContactId;
            _activeContactId = action.contactId;
            if(!_preActiveContactId) {
                _preActiveContactId = _activeContactId;
            }
            //ChatContactsStore.emitChange();
            ChatContactsStore.emitContactSelect();
            break;

        case ActionTypes.CONTACT_MESSAGES_SCROLL:
            _contacts[action.contactId].scrollTop = action.scrollTopValue;
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
    switch(action.type) {
        case ActionTypes.CLICK_CONTACT:
            var index = _messages[_preActiveContactId].firstUnreadMsgIndex;
            if(typeof index == 'number'){
                _messages[_preActiveContactId].messages[index].firstUnread = false;
            }
            ChatMessageStore.emitChange();
            break;
        case ActionTypes.READ_MESSAGE:
            var messages = _messages[action.contactId].messages;
            var unreadIndex = -1;
            for(var i = messages.length-1; i>=0; i--){
                if(messages[i].isRead){
                    break;
                }else{
                    unreadIndex = i;
                }
                _messages[action.contactId].messages[i].isRead = true;
            }

            if(unreadIndex>=0){
                _messages[action.contactId].messages[unreadIndex].firstUnread = true;
                _messages[action.contactId].firstUnreadMsgIndex = unreadIndex;
                UnreadChatMessageStore.emitChange();
            }else {
                UnreadChatMessageStore.emitChange();
            }

            break;
        case ActionTypes.NEW_OUT_MESSAGE:
            message = CoreUtils.createOutMessageFromRaw(
                action.message,
                action.sender,
                action.receiver,
                action.msgType
            );
            _messages[action.receiver.id].messages.push(message);
            _messages[action.receiver.id].lastMessage = message;
            activeContactId = ChatContactsStore.getActive();
            message.isRead = (activeContactId == action.receiver.id);
            if(action.receiver.id == activeContactId) {
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
            var id = ChatContactsStore.getId(action.sender);
            activeContactId = ChatContactsStore.getActive();
            message.isRead = (activeContactId == id);
            _messages[id].messages.push(message);
            _messages[id].lastMessage = message;
            if(id == activeContactId) {
                ChatMessageStore.emitUpdate();
            }
            ChatMessageStore.emitChange();
            break;

        case ActionTypes.RECEIVE_RAW_MESSAGES:
            ChatMessageStore.init(action.rawMessages);
            ChatMessageStore.emitChange();
            break;

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
    createAction: function (contactId, prevContactId) {
        ChatDispatcher.dispatch({
            type: ActionTypes.CLICK_CONTACT,
            prevContactId: prevContactId,
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
                    {this.props.data.message || 'Empty message'}
                </div>
            </li>
        );
    }
});

var UnreadOutgoingMessage = React.createClass({
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
                    {this.props.data.message || 'Empty message'}
                </div>
            </li>
        );
    }
});


var IncomingMessage = React.createClass({
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
                    {this.props.data.message || 'Empty message'}
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
                    {this.props.data.message || 'Empty message'}
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

var FooterBox = React.createClass({
    getInitialState: function() {
        return {
            value: ''
        };
    },
    sendMessage: function(e){
        //if(typeof this.props.onMessage == 'function'){
        //    this.props.onMessage({
        //        message: this.state.value
        //    });
        //}
        OutgoingMessageAction.createMessage(
            this.state.value,
            this.props.operator,
            this.props.contact,
            'text'
        );
        this.setState({ value: '' });
    },
    handleChange: function(event){
        this.setState({value: event.target.value});
    },
    handleKeyUp: function(event){
        if (event.keyCode === 13) {
            this.sendMessage();
        }
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
                <IconButton classes="fa fa-file-image-o"/>
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
                        <UnreadIncomingMessage key={message.id}
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
                        <UnreadOutgoingMessage key={message.id}
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
    componentWillUpdate: function(nextProps, nextState) {
        if(nextProps.contact.id != this.props.contact.id){
            this.scroll = 0;
        }
        var node = ReactDOM.findDOMNode(this);
        this.shouldScrollBottom = (node.scrollTop >= this.scroll);
    },
    componentDidUpdate: function() {
        if(this.shouldScrollBottom) {
            var node = ReactDOM.findDOMNode(this);
            node.scrollTop = node.scrollHeight;
            this.scroll = node.scrollTop;
        }
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
        return {
            data: this.props.data || {},
            active: false
        }
    },

    componentDidMount: function() {
        UnreadChatMessageStore.addChangeListener(this._onUnreadChange);
    },

    componentWillUnmount: function() {
        UnreadChatMessageStore.removeChangeListener(this._onUnreadChange);
    },

    _onUnreadChange: function(){
        var unread = UnreadChatMessageStore.getCount(this.state.data.id);
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
        if(this.props.selectedId == contact.id){
            return ' active';
        }
        return '';
    },
    render: function() {
        return (
            <li className={"clearfix" + this.clientActive() }  onClick={this.activateContact}>
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
    getInitialState: function() {
        return {
            selectedId: '',
            selectedContact: {}
        }
    },
    onActivateContact: function(contact){
        var prevContactId = this.state.selectedId
        this.setState({
            selectedId: contact.id,
            selectedContact: contact
        });

        //if(typeof this.props.onSelectContact == 'function') {
        //    this.props.onSelectContact(contact);
        //}
        ClickContactAction.createAction(contact.id, prevContactId);
        ReadMessageAction.createAction(contact.id);
    },
    render: function() {
        var selectedId = this.state.selectedId;
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
    render: function() {
        return (
            <div className="search">
                <input type="text" placeholder="search"/>
                <i className="fa fa-search"></i>
            </div>
        );
    }
});

var ContactsBox = React.createClass({
    render: function() {
        return (
            <div className="people-list" id="people-list">
                <ContactSearchBox/>
                <ContactsListBox items={this.props.contacts} onSelectContact={this.props.onSelectClient}/>
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
        this.loadContacts();
    },

    _onMessagesChange: function(){
        this.loadMessages(ChatContactsStore.getCurrentContact());
    },

    loadContacts: function(){
        this.setState({
            contacts: ChatContactsStore.getAll()
        });
    },
    loadMessages: function(contact){
        this.setState({
            messages: ChatMessageStore.getMessages(contact.id)
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
        this.loadMessages(client);
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
    _onMessagesScroll: function(scrollTopValue){
        //ChatContactsStore.setScrollTop(
        //    this.state.currentContact.id,
        //    scrollTopValue
        //);
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
                        <ContactsBox contacts={this.state.contacts} onSelectClient={this.selectClient}/>
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
    function getRandomItem (arr) {
        var count = 2 || arr.length;
        return arr[Math.floor(Math.random() * count)];
    }
    var index = 0;
    setInterval(function(){
        var contact = getRandomItem(_contacts);
        var date = CoreUtils.formatDate(new Date());
        IncomingMessageAction.createMessage(
            getRandomItem(messageResponses),
            contact.name,
            '',
            'text',
            date);
        index++;
    }, 3000);
}