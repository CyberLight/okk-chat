var Global = {
    contacts: [
        {
            id: 1,
            name: '+996555111222',
            status: 'online'
        },
        {
            id: 2,
            name: '+996255111223',
            status: 'offline'
        },
        {
            id: 3,
            name: '+996355111224',
            status: 'online'
        },
        {
            id: 4,
            name: '+996455111225',
            status: 'offline'
        },
        {
            id: 5,
            name: '+996655111226',
            status: 'online'
        },
        {
            id: 6,
            name: '+996755111227',
            status: 'online'
        }
    ],

    messages: {
            '+996555111222': [
                {
                    id:1,
                    name: '+996555111222',
                    contentType: 'text',
                    message: 'Message #1',
                    msgType: 'in',
                    operator: false,
                    datetime: '2016-03-01 10:10:10'
                },
                {
                    id:2,
                    name: 'Ксения',
                    contentType: 'text',
                    message: 'Message from operator #1',
                    msgType: 'out',
                    operator: true,
                    datetime: '2016-03-01 10:11:10'
                }
            ],
            '+996255111223': [
                {
                    id:1,
                    name: '+996255111223',
                    contentType: 'text',
                    message: 'Message #2',
                    msgType: 'in',
                    operator: false,
                    datetime: '2016-03-01 09:11:10'
                },
                {
                    id:2,
                    name: 'Ксения',
                    contentType: 'text',
                    message: 'Message from operator #2',
                    msgType: 'out',
                    operator: true,
                    datetime: '2016-03-01 10:03:10'
                },
                {
                    id:3,
                    name: '+996255111223',
                    contentType: 'text',
                    message: 'Message #2',
                    msgType: 'in',
                    operator: false,
                    datetime: '2016-03-01 10:05:07'
                }
            ],
            '+996355111224': [
                {
                    id:1,
                    name: '+996355111224',
                    contentType: 'text',
                    message: 'Message #3',
                    msgType: 'in',
                    operator: false,
                    datetime: '2016-03-01 08:10:09'
                },
                {
                    id:2,
                    name: 'Ксения',
                    contentType: 'text',
                    message: 'Message from operator #3',
                    msgType: 'out',
                    operator: true,
                    datetime: '2016-03-01 09:08:10'
                },
                {
                    id:3,
                    name: '+996355111224',
                    contentType: 'text',
                    message: 'Message #3',
                    msgType: 'in',
                    operator: false,
                    datetime: '2016-03-01 10:11:10'
                },
                {
                    id:4,
                    name: '+996355111224',
                    contentType: 'text',
                    message: 'Message #3 ....',
                    msgType: 'in',
                    operator: false,
                    datetime: '2016-03-01 11:12:10'
                }
            ]}
};


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
                <span className="mark">Unread {this.props.count || 0} messages</span>
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
            <button className={this.props.classes}>
                <i className={this.props.icons}></i>
                &nbsp;&nbsp;{this.props.title || ''}
            </button>
        );
    }
});

var FooterBox = React.createClass({
    render: function() {
        return (
            <div className="chat-message clearfix">
                <textarea name="message-to-send"
                          id="message-to-send"
                          placeholder="Type your message"
                          rows="3"></textarea>
                <IconButton classes="fa fa-file-o"/>&nbsp;&nbsp;&nbsp;
                <IconButton classes="fa fa-file-image-o"/>
                <HistoryButton title="send" icons="fa fa-paper-plane-o" classes="btn-send"/>
                <HistoryButton title="end" icons="fa fa-comments" classes="btn-replied"/>
            </div>
        );
    }
});

var HistoryBox = React.createClass({
    renderMessage: function(message){
        var contact = this.props.contact;
        switch(message.msgType){
            case 'in':
                return (
                    <IncomingMessage key={message.id}
                                     data={message}
                                     status={contact.status} />
                );
            case 'out':
                return (
                    <OutgoingMessage key={message.id}
                                     data={message}
                                     status={contact.status}/>
                )
        }
    },
    componentDidUpdate: function() {
        var node = ReactDOM.findDOMNode(this);
        node.scrollTop = node.scrollHeight;
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

    activateContact: function(){
        if(typeof this.props.onActivate == 'function'){
            this.props.onActivate(this.state.data);
        }
    },
    getUnreadMessageCount: function(){
        if(this.state.data.unread || 0 > 0) {
            return (
                <i className="msg-badge unread">{this.state.data.unread || 0}</i>
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
        this.setState({
            selectedId: contact.id,
            selectedContact: contact
        });

        if(typeof this.props.onSelectContact == 'function') {
            this.props.onSelectContact(contact);
        }
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
    onClose: function(){
        if(typeof this.props.onClose == 'function'){
            this.props.onClose();
        }
    },
    render: function() {
        return (
            <div className="chat">
                <HeaderBox contact={this.props.contact} count={this.props.messages.length} onClose={this.onClose}/>
                <HistoryBox contact={this.props.contact} messages={this.props.messages}/>
                <FooterBox/>
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
            currentContact: {}
        };
    },
    loadContacts: function(){
        this.setState({
            contacts: Global.contacts
        });
    },
    loadMessages: function(contact){
        this.setState({
            messages: Global.messages[contact.name] || []
        });
    },
    authSuccess: function(){
        this.setState({
            chatState: 'no-chat'
        });
        this.loadContacts();
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
                                         messages={this.state.messages}
                                         onClose={this.onConversationClose}/>
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

ReactDOM.render(
    <ChatBox />,
    document.getElementById('chatbox')
);