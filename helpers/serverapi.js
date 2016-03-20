function OkkChatReady(OkkChatApi) {
    var _id = 0;

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

    var FakeContactsGenerator = objectAssign({}, {
        generate: function (count) {
            var contacts = [];
            var genCount = count || 10;
            var statuses = ['online', 'offline'];

            for (var i = 0; i < genCount; i++) {
                var item = {
                    id: i,
                    name: '+996555' + genNumber(),
                    status: getRandomItem(statuses)
                };
                contacts.push(item);
            }
            return contacts;
        }
    });

    var FakeMessagesGenerator = objectAssign({}, {
        _messageResponses: [
            'Why did the web developer leave the restaurant? Because of the table layout.',
            'How do you comfort a JavaScript bug? You console it.',
            'An SQL query enters a bar, approaches two tables and asks: "May I join you?"',
            'What is the most used language in programming? Profanity.',
            'What is the object-oriented way to become wealthy? Inheritance.',
            'An SEO expert walks into a bar, bars, pub, tavern, public house, Irish pub, drinks, beer, alcohol'
        ],
        _contentType: ['text', 'text', 'image'],
        _isOperator: [0, 0, 0, 0, 0, 1],
        _endIncomingMessages: [1],
        _operatorNames: ['Лена', 'Валентина', 'Алина', 'Настя'],
        generate: function (contactId, count) {
            var rawMessages = [];
            for (var i = 0; i < count; i++) {
                rawMessages.push(this.generateOne(contactId));
            }
            return rawMessages;
        },
        generateOne: function (contactId) {
            var contact = {name: contactId};
            var date = OkkChatApi.CoreUtils.formatDate(new Date());

            var currentContentType = getRandomItem(this._contentType);
            var sender = '';
            var receiver = '';
            var messageType = OkkChatApi.MessageTypes.INCOMING;
            var isOperatorFlag = getRandomItem(this._isOperator);
            if (isOperatorFlag) {
                sender = getRandomItem(this._operatorNames);
                receiver = contact.name;
                isOperatorFlag = true;
                var endConversationFlag = getRandomItem(this._endIncomingMessages);
                if (endConversationFlag && currentContentType != OkkChatApi.MessageContentTypes.IMAGE) {
                    messageType = OkkChatApi.MessageTypes.END_OF_CONVERSATION;
                } else {
                    messageType = OkkChatApi.MessageTypes.INCOMING;
                }
            } else {
                sender = contact.name;
                receiver = '';
                isOperatorFlag = false;
            }
            var id = ++_id;
            if (currentContentType == OkkChatApi.MessageContentTypes.TEXT) {
                return {
                    id: id,
                    message: getRandomItem(this._messageResponses),
                    sender: sender,
                    receiver: receiver,
                    contentType: OkkChatApi.MessageContentTypes.TEXT,
                    messageType: messageType,
                    operator: isOperatorFlag,
                    date: date
                };
            } else if (currentContentType == OkkChatApi.MessageContentTypes.IMAGE) {
                return {
                    id: id,
                    message: getRandomItem(ImageMessages),
                    sender: sender,
                    receiver: receiver,
                    contentType: OkkChatApi.MessageContentTypes.IMAGE,
                    messageType: messageType,
                    operator: isOperatorFlag,
                    date: date
                };
            }
        }
    });

    var ServerAPI = objectAssign({}, {
        _loadQueue: {},
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
        authenticate: function (credentials) {
            setTimeout(function () {
                var testOperator = {name: 'Ксения', status: 'online'};
                OkkChatApi.Actions.authSuccess(testOperator);
            }, 1500);
        },
        loadContacts: function () {
            var rawContacts = FakeContactsGenerator.generate(20);
            OkkChatApi.Stores.ContactsStore.init(rawContacts);
            OkkChatApi.Stores.ContactsStore.emitChange();
        },
        loadRawContactMessages: function (contactId) {
            setTimeout(function () {
                var count = 30; //Math.floor(Math.random() * 30);
                var rawMessages = FakeMessagesGenerator.generate(contactId, count);
                var operator = OkkChatApi.Stores.AuthStore.getOperator();
                OkkChatApi.Stores.MessageStore.addContactRawMessages(operator, rawMessages);
                OkkChatApi.Stores.MessageStore.emitUpdate();
                OkkChatApi.Stores.ContactsStore.setLoadingState(contactId, 'loaded');
                ServerAPI.popQueue(contactId);
            }.bind(this), 3000);
        },
        runFakeMessageLoop: function(){
            setInterval(function () {
                var contacts = OkkChatApi.Stores.ContactsStore.getAll();
                var message = FakeMessagesGenerator.generateOne(getRandomItem(contacts).name);
                OkkChatApi.Actions.incomingMessage(message);
            }.bind(this), 5000);
        }
    });

    ServerAPI.dispatchToken = OkkChatApi.Dispatcher.register(function (action) {
        switch (action.type) {
            case OkkChatApi.ActionTypes.API_FETCH_CONTACTS:
                ServerAPI.loadContacts();
                ServerAPI.runFakeMessageLoop();
                break;
            case OkkChatApi.ActionTypes.API_AUTH_OPERATOR:
                ServerAPI.authenticate(action.credentials);
                break;
            case OkkChatApi.ActionTypes.API_FETCH_CONTACT_HISTORY:
                var contactId = action.contact.name;
                var added = ServerAPI.pushQueue(contactId);
                if(added) {
                    ServerAPI.loadRawContactMessages(contactId);
                }
                break;
            default:
                break;
        }
    });
}