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
    appendTemplate(doc, "message-template");
    appendTemplate(doc, "message-response-template");
    appendTemplate(doc, "message-typing-template");
    appendTemplate(doc, "chat-header-template");
    appendTemplate(doc, "chat-history-template");
    appendTemplate(doc, "chat-footer-template");

    var chat = {
        messageResponses: [
            'Why did the web developer leave the restaurant? Because of the table layout.',
            'How do you comfort a JavaScript bug? You console it.',
            'An SQL query enters a bar, approaches two tables and asks: "May I join you?"',
            'What is the most used language in programming? Profanity.',
            'What is the object-oriented way to become wealthy? Inheritance.',
            'An SEO expert walks into a bar, bars, pub, tavern, public house, Irish pub, drinks, beer, alcohol'
        ],
        init: function () {
            this.currentState = new ShowMessagesState(chat);
            this.cacheDOM();
            this.bindEvents();
            this.render();
        },
        cacheDOM: function () {
            this.$chat = $('.chat');
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

    function ShowMessagesState(chat) {
        var self = this;
        self.chat = chat;
        self.messageToSend = '';

        self.addMessage = function() {
            self.messageToSend = self.$textarea.val();
            render();
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
                var template = Handlebars.compile($("#message-template").html());
                var context = {
                    messageOutput: self.messageToSend,
                    time: self.chat.getCurrentTime()
                };

                self.$chatHistoryList.append(template(context));
                self.scrollToBottom();
                self.$textarea.val('');

                // responses
                var templateResponse = Handlebars.compile($("#message-response-template").html());
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

