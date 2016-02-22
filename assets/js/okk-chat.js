/**
 * Created by avishnyakov on 2/17/16.
 */

(function () {

    function appendTemplate(doc, templateId) {
        var container = doc.getElementById(templateId);
        var clone = document.importNode(container, true);
        document.body.appendChild(clone);
    }

    var doc = document.querySelector('link#okk-chat-template[rel="import"]').import;
    appendTemplate(doc, "chat-template");
    appendTemplate(doc, "chat-template-min");
    appendTemplate(doc, "chat-message-template");
    appendTemplate(doc, "chat-message-response-template");
    appendTemplate(doc, "chat-message-typing-template");
    appendTemplate(doc, "chat-header-template");
    appendTemplate(doc, "chat-history-template");
    appendTemplate(doc, "chat-footer-template");
    appendTemplate(doc, "chat-auth-progress-template");
    appendTemplate(doc, "chat-people-template");
    appendTemplate(doc, "chat-no-conversation-template");

    var chat = {
        messageResponses: [
            'Why did the web developer leave the restaurant? Because of the table layout.',
            'How do you comfort a JavaScript bug? You console it.',
            'An SQL query enters a bar, approaches two tables and asks: "May I join you?"',
            'What is the most used language in programming? Profanity.',
            'What is the object-oriented way to become wealthy? Inheritance.',
            'An SEO expert walks into a bar, bars, pub, tavern, public house, Irish pub, drinks, beer, alcohol'
        ],
        states: {
          'Auth'           : ShowAuthChatState,
          'Chat'           : ShowMessagesState,
          'NoConversation' : NoConversationChatState
        },
        init: function () {
            this.currentState = new this.states['Auth'](chat);
            this.cacheDOM();
            this.bindEvents();
            this.render();
        },
        changeState: function(name){
            chat.currentState = new chat.states[name](chat);
            chat.cacheDOM();
            chat.bindEvents();
            chat.render();
        },
        cacheDOM: function () {
            this.$chat = $('.chat');
            this.$peoples = $('.people-list');
            this.currentState.cacheDOM(this);
        },
        bindEvents: function () {
            this.currentState.bindEvents(this);
        },

        render: function () {
            this.currentState.render(this);
        },

        getCurrentTime: function () {
            return new Date().toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
        },
        getRandomItem: function (arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

    };

    chat.init();

    var searchFilter = {
        options: {valueNames: ['name']},
        init: function () {
            var userList = new List('people-list', this.options);
            var noItems = $('<li id="no-items-found">No items found</li>');

            userList.on('updated', function (list) {
                if (list.matchingItems.length === 0) {
                    $(list.list).append(noItems);
                } else {
                    noItems.detach();
                }
            });
        }
    };

    searchFilter.init();

    function ShowAuthChatState(chat) {
        var self = this;
        self.chat = chat;
        self.working = false;

        self.loginBtnClick = function(event){
            if(self.working) return false;
            self.working = true;
            self.chat.$peoples.hide();
            var $state = self.chat.$chat.find('button > .state');
            self.$wrapper.addClass('loading');
            $state.html('Authenticating');

            setTimeout(function() {
                self.$wrapper.addClass('ok');
                $state.html('Welcome back!');
                setTimeout(function() {
                    $state.html('Log in');
                    self.$wrapper.removeClass('ok loading');
                    self.working = false;
                    self.chat.$peoples.show();
                    self.chat.changeState('Chat');
                }, 4000); //4000
            }, 5000); //3000
        };

        function cacheDOM(){
            var progressTpl = Handlebars.compile($("#chat-auth-progress-template").html());
            self.chat.$peoples.hide();
            self.chat.$chat.html('');
            self.chat.$chat.append(progressTpl());

            self.$loginBtn = self.chat.$chat.find('.login-btn');
            self.$wrapper = self.chat.$chat.find('.wrapper');
        }

        function bindEvents(){
            self.$loginBtn.on('click', self.loginBtnClick.bind(self));
        }

        function render () { }

        return {
            cacheDOM: cacheDOM,
            bindEvents: bindEvents,
            render: render
        }
    }

    function NoConversationChatState(chat) {
        var self = this;
        self.chat = chat;

        function cacheDOM(){
            var noConversationTpl = Handlebars.compile($("#chat-no-conversation-template").html());
            self.chat.$chat.html('');
            self.chat.$chat.append(noConversationTpl());
        }

        function bindEvents(){

        }

        function render () {

        }

        return {
            cacheDOM: cacheDOM,
            bindEvents: bindEvents,
            render: render
        }
    }

    function ShowMessagesState(chat) {
        var self = this;
        self.chat = chat;
        self.messageToSend = '';

        self.addMessage = function() {
            self.messageToSend = self.$textarea.val();
            render();
        };

        self.addPeople = function(){

        };

        self.addMessageEnter = function (event) {
            // enter was pressed
            if (event.keyCode === 13) {
                self.addMessage();
            }
        };

        self.scrollToBottom = function () {
            self.$chatHistory.scrollTop(self.$chatHistory[0].scrollHeight);
        };

        function cacheDOM(){
            var headerTpl = Handlebars.compile($("#chat-header-template").html());
            var historyTpl = Handlebars.compile($("#chat-history-template").html());
            var footerTpl = Handlebars.compile($("#chat-footer-template").html());
            var peopleTpl = Handlebars.compile($("#chat-people-template").html());

            self.chat.$chat.html('');
            self.chat.$chat.append(headerTpl({phone: '+996555123123', messagesCount: 1234}));
            self.chat.$chat.append(historyTpl());
            self.chat.$chat.append(footerTpl());

            self.$chatHistory = self.chat.$chat.find('.chat-history');
            self.$button = self.chat.$chat.find('button');
            self.$textarea = self.chat.$chat.find('#message-to-send');
            self.$chatHistoryList = self.$chatHistory.find('ul');
        }

        function bindEvents(){
            self.$button.on('click', self.addMessage.bind(self));
            self.$textarea.on('keyup', self.addMessageEnter.bind(self));
        }

        function render () {
            self.scrollToBottom();
            if (self.messageToSend.trim() !== '') {
                var template = Handlebars.compile($("#chat-message-template").html());
                var context = {
                    messageOutput: self.messageToSend,
                    time: self.chat.getCurrentTime()
                };

                self.$chatHistoryList.append(template(context));
                self.scrollToBottom();
                self.$textarea.val('');

                // responses
                var templateResponse = Handlebars.compile($("#chat-message-response-template").html());
                var contextResponse = {
                    response: self.chat.getRandomItem(chat.messageResponses),
                    time: self.chat.getCurrentTime()
                };

                setTimeout(function () {
                    this.$chatHistoryList.append(templateResponse(contextResponse));
                    this.scrollToBottom();
                }.bind(self), 1500);
            }
        }

        return {
            cacheDOM: cacheDOM,
            bindEvents: bindEvents,
            render: render
        }
    }

})();

