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
        var getCurrentTime = function () {
            return new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };

        return (
            <li>
                <div className="message-data">
                    <span className="message-data-name">
                        <i className={"fa fa-circle " + (this.props.status || 'offline')}></i>
                        {this.props.phone || 'Not specified'}
                    </span>
                    <span className="message-data-time">
                        {this.props.time || getCurrentTime()}, {this.props.days || 'Today'}
                    </span>
                </div>
                <div className="message my-message">
                    {this.props.message || 'Empty message'}
                </div>
            </li>
        );
    }
});

var OutgoingMessage = React.createClass({
    operatorStatus: function () {
        if (this.props.operator) {
            return (
                <i className="msg-badge">operator</i>
            );
        } else {
            return '';
        }
    },
    render: function() {
        var getCurrentTime = function () {
            return new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        };

        return (
            <li className="clearfix">
                <div className="message-data align-right">
                    <span className="message-data-time">
                        {this.props.time || getCurrentTime()}, {this.props.days || 'Today'}
                    </span> &nbsp;&nbsp;
                    <span className="message-data-name">
                        {this.props.senderName || 'Empty sender'}
                        {this.operatorStatus()}
                    </span>
                    &nbsp;&nbsp;
                    <i className={"fa fa-circle " + (this.props.status || 'me')}></i>
                </div>
                <div className="message other-message float-right">
                    {this.props.message || 'Empty message'}
                </div>
            </li>
        );
    }
});

var HeaderBox = React.createClass({
    render: function() {
        return (
            <div className="chat-header clearfix">
                <div className="chat-about">
                    <div className="chat-with"> Chat with: {this.props.phone || ''}</div>
                    <div className="chat-num-messages">
                        already
                        <i className="msg-badge">{this.props.messagesCount || 0}</i>
                        messages
                    </div>
                </div>
                <IconButton classes="fa fa-times header-icon"/>
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
            <i className={this.props.classes}></i>
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
    render: function() {
        return (
            <div className="chat-history">
                <ul className="chat-history-messages">
                    <OutgoingMessage operator="true" />
                    <UnreadMessageDelimeter/>
                    <IncomingMessage/>
                    <EndConversationMessage/>
                    <TypingMessage/>
                </ul>
            </div>
        );
    }
});

var Contact = React.createClass({
    render: function() {
        return (
            <li className="clearfix">
                <div className="about">
                    <div className="name">+996555000000</div>
                    <div className="status">
                        <i className="fa fa-circle online"></i> online
                    </div>
                    <div className="msg-unread">
                        <i className="msg-badge unread">12</i>
                    </div>
                </div>
            </li>
        );
    }
});

var ContactsListBox = React.createClass({
    render: function() {
        return (
            <ul className="list">
                <Contact/>
                <Contact/>
                <Contact/>
                <Contact/>
                <Contact/>
                <Contact/>
                <Contact/>
                <Contact/>
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
                <ContactsListBox/>
            </div>
        );
    }
});

var ConversationBox = React.createClass({
    render: function() {
        return (
            <div className="chat">
                <HeaderBox/>
                <HistoryBox/>
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
    renderState: function(){
        switch(this.props.loginState || 'login'){
            case 'login':
                return (
                    <div className="chat">
                        <div className="wrapper">
                            <button className="login-btn">
                                <i className="chat-spinner"></i>
                                <span className="state">Log in</span>
                            </button>
                        </div>
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
        return this.renderState();
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
    renderState: function(){
        switch(this.props.chatState || 'login'){
            case 'login':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <LoginBox/>
                    </div>
                );
            case 'chat':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <ContactsBox/>
                        <ConversationBox/>
                    </div>
                );
            case 'no-chat':
                return (
                    <div id="chat-template" className="chat-container clearfix">
                        <ContactsBox/>
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