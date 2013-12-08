//Contains functions and vars to handle all client logic.
ClientManager = {
    clients: [],
    clientNo: 1,
    addClient: function() {
	var clientId = ClientManager.clientNo;
	var html = '<div id="client-'+clientId+'" class="col-md-6 client-container">'+
	    '<div class="client-inner-container">'+
	    '<h2>Client '+clientId+
	    '<span class="client-status-bar">'+
		'<button type="button" class="btn btn-primary client-status-button">Connect</button> '+
		'<img class="client-status" src="images/disconnected.png" />'+
	      '</span>'+
	    '</h2>'+
	    '<label>Request</label>'+
	    '<textarea rows="3" class="form-control client-request-input"></textarea> '+
	    '<button type="button" class="btn btn-primary client-send-button" disabled>Send request</button> '+
	    '<button type="button" class="btn btn-info client-clear-button">Clear log</button> '+
	    '<div class="response-log-container"> '+
	      '<label>Log</label> '+
	      '<pre class="response-log"></pre>'+
	    '</div>'+
	  '</div>'+
	'</div>';

	var container = $('#container');
	if ((ClientManager.clientNo-1) % 2 == 0) {
	    container.append('<div class="row"></div>')
	}
	container.children('.row').last().append(html);
	var client = $('#client-'+clientId);
	client.find('.client-status-button').click(function (){
	    ClientManager.connectSocket(clientId);
	});
	client.find('.client-send-button').click(function () {
	    sendMessage(clientId);
	});
	client.find('.client-clear-button').click(function() {
	    Logger.clearLog(clientId);
	});
	ClientManager.addClientObject(clientId, client);
	ClientManager.clientNo++;
    },
    addClientObject: function(clientId, element, socket) {
	ClientManager.clients[clientId] = {
	    element: element,
	    log: element.find('.response-log').first(),
	    socket: socket
	};
    },
    removeClientObject: function(clientId) {
	delete ClientManager.clients[clientId];
    },
    getClient: function(clientId) {
	return ClientManager.clients[clientId];
    },
    removeClient: function() {
	if (ClientManager.clientNo > 2) {
	    ClientManager.clientNo--;
	    var clientId = ClientManager.clientNo;
	    ClientManager.disconnectSocket(clientId);
	    var client = ClientManager.getClient(clientId);
	    var parent = client.element.parent();
	    client.element.remove();
	    if (parent.is(':empty'))
		parent.remove();
	    ClientManager.removeClientObject(clientId);
	}
    },
    connectAllClients: function() {
	for(i in ClientManager.clients) {
	    ClientManager.connectSocket(i);
	}
    },
    disconnectAllClients: function() {
	for(i in ClientManager.clients) {
	    ClientManager.disconnectSocket(i);
	}
    },
    connectSocket: function(clientId) {
	var client = ClientManager.getClient(clientId);
	if (client.socket == null) {
	    try {
	    client.socket = new WebSocket(getUrl());
	    } catch (err) {
		displayURLError("Not a valid URL.")
		return;
	    }
	    client.socket.onopen = function(event) {
		client.element.find('.client-status').attr('src', '/images/connected.png');
		var button = client.element.find('.client-status-button');
		button.html("Disconnect");
		button.unbind('click').click(function () {
		    ClientManager.disconnectSocket(clientId);
		});
		disableUrlField();
		enableSendButton(clientId);
		Logger.addStatusMessage(clientId, "Connection established.");
	    };
	    client.socket.onclose = function() {
		client.element.find('.client-status').attr('src', '/images/disconnected.png');
		if (ClientManager.allClientsDisconnected()) {
		    enableUrlField();
		}
		disableSendButton(clientId);
		client.socket = null;
		var button = client.element.find('.client-status-button');
		button.html("Connect");
		button.unbind('click').click(function () {
		    ClientManager.connectSocket(clientId);
		});
		Logger.addStatusMessage(clientId, "Connection closed.");
	    };
	    client.socket.onmessage = function(event) {
		Logger.addServerMessage(clientId, event.data);
	    }
	    client.socket.onerror = function(event) {
		console.log(event)
		Logger.addStatusMessage(clientId, "An error occured when trying to connect to the server.");
	    }
	}
    },
    disconnectSocket: function(clientId) {
	var client = ClientManager.getClient(clientId);
	if (client.socket != null) {
	    client.socket.close();
	    client.socket = null;
	}
    },
    allClientsDisconnected: function() {
	var t = true;
	for (i in ClientManager.clients) {
	    if (ClientManager.clients[i].socket != null) {
		t = false;
		break;
	    }
	}
	return t;
    }
};

// Adds log messages to client logs.
Logger = {
    clearLog: function (clientId) {
	var client = ClientManager.getClient(clientId);
	client.log.empty();
    },
    clearAllLogs: function () {
	$('.response-log').empty();
    },
    addMessage: function (clientId, message) {
	var client = ClientManager.getClient(clientId);
	client.log.append("<div>"+message+"</div>");
	client.log.animate({scrollTop: client.log.prop('scrollHeight')}, 50);
    },
    addServerMessage: function (clientId, message) {
	Logger.addMessage(clientId, '<span class="server-color">server &gt;&gt;</span> '+message);
    },
    addClientMessage: function (clientId, message) {
	Logger.addMessage(clientId, '<span class="client-color">client &gt;&gt;</span> '+message);
    },
    addStatusMessage: function (clientId, message) {
	Logger.addMessage(clientId, '<span class="status-color">status &gt;&gt;</span> '+message);
    }
};

function displayURLError(errorMessage) {
    var errorBox = $('#url-error-box');
    errorBox.html(errorMessage);
    errorBox.show(400, function() {
	setTimeout(function(){
	    errorBox.hide(400);
	}, 2000);
    });
}

//UI and misc functions
function enableSendButton(clientId) {
    ClientManager.getClient(clientId).element.find('.client-send-button').prop('disabled', false);
}

function disableSendButton(clientId) {
    ClientManager.getClient(clientId).element.find('.client-send-button').prop('disabled', true);
} 

function sendMessage(clientId) {
    var client = ClientManager.getClient(clientId);
    messageContainer = client.element.find('.client-request-input');
    if (client.socket != null) {
	client.socket.send(messageContainer.val());
	Logger.addClientMessage(clientId, messageContainer.val());
    }
    messageContainer.val("");
}

function getUrl() {
    return $('#url-input').val();
}

function disableUrlField() {
    $('#url-input').prop("disabled", true);
}

function enableUrlField() {
    $('#url-input').prop("disabled", false);
}

$(document).ready(function () {
    //Adds client 1
    ClientManager.addClient();

    $('#connect-all-button').click(ClientManager.connectAllClients);
    $('#disconnect-all-button').click(ClientManager.disconnectAllClients);
    $('#add-client-button').click(ClientManager.addClient);
    $('#remove-client-button').click(ClientManager.removeClient);
    $('#clear-all-logs-button').click(Logger.clearAllLogs);
});