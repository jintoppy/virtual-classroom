var socket;
var peerConn, localStream, channel;
var mediaConstraints = {'mandatory':{
	'offerToReceiveAudio': true,
	'offerToReceiveVideo': false
}};
	window.onload = function(){

		checkIfUserSeeingThePage();
		var messages = [];
		var isConnected = false;
		var isTutor = false;

		socket = io.connect('https://localhost');
		var field = document.getElementById('field');
		var sendBtn = document.getElementById('send');
		var content = document.getElementById('content');
		var roomid = document.getElementById('roomid');
		var join = document.getElementById('join');
		var datachannelsend = document.getElementById('datachannelsend');
		var createClassTextbox = document.getElementById('createclassId');
		var createClassBtn = document.getElementById('create');
		var studentAcceptBtn = $('#newStudentRequestModal #acceptStudentBtn');
		var nametxtbox = $('#nametxtbox');
		window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
		window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
		enableWebRTC();
		
		socket.on('connect',function(){
			//socket.emit('room',roomid);
			enableRTCPeerConnection();
		});

		var started = false;
		socket.on('message',function(data){
			console.log('data.type is ' + data.type);
			if(data.type=== 'offer'){
				console.log('offer');
				if(!started){
					started= true;
				}

			
				peerConn.setRemoteDescription(new RTCSessionDescription(data));
				peerConn.createAnswer(setLocalAndSendMessage, errorCallback, mediaConstraints);
			}
			else if(data.type === 'answer' && started){
				console.log('answer');
				// answerer must wait for the data channel
				peerConn.setRemoteDescription(new RTCSessionDescription(data));
			}
			else if(data.type === 'candidate' && started){
				var candidate = new RTCIceCandidate(data.candidate);
				peerConn.addIceCandidate(candidate);
			}
			if(data.message){
				var html='';
				messages.push(data.message);
				for(var i=0; i< messages.length;i++){
					html += messages[i] + '<br/>';
				}
				content.innerHTML = html;
			}
			else{
				console.log('no data');
			}
		});

		socket.on('studentDetails',function(data){
			for(var i=0; i<data.studentsData.length;i++){
				var currentStudentname = data.studentsData[i].name;
				var currentStudentId = data.studentsData[i].id;
				$('#currentStudents ul.nav').append('<li class="student_thumb"> <input type="hidden" value="'+currentStudentId+'" /> <a href="#" class="thumbnail">' + currentStudentname +'</a></li>');
			}

		})

		socket.on('createclass_status',function(data){
			var modal = $('#classCreateStatusModal');
			if(data.message === 'success'){
				modal.find('.modal-body').html('Class created successfully with id ' + data.classid);
			}
			else
			{
				modal.find('.modal-body').html(data.message);
			}
			modal.modal('show');
		});

		socket.on('joinClassRequestFromStudent', function(data){
			console.log('please see the requirest');
			var modal = $('#newStudentRequestModal');
			modal.find('.modal-body').html('Student  ' + data.studentname + ' would like to join');
			$('#newStudentRequestModal #classid').val(data.classid);
			$('#newStudentRequestModal #studentname').val(data.studentname);
			modal.modal('show');
		});

		socket.on('studentAcceptResponse',function(data){
			if(data.message === 'success')
			{
			$('#classRoomTitle').html('You are in class ' + data.classid);
			$('#loginScreen').hide();
			$('#classScreen').show();	
			}
			
		});

		sendBtn.onclick = function(){
			var text = field.value;
			socket.emit('send', {message: text});
			return false;
		};

		join.onclick = function(){
			console.log(nametxtbox.val());
			var studentData = {
				name: nametxtbox.val(),
				classid: roomid.value
			}
			socket.emit('joinClassRequest',studentData);
			return false;
		};

		createClassBtn.onclick = function(){
			var inputdata = {
				classid: createClassTextbox.value,
				name: nametxtbox.val()
			};
			socket.emit('createclass',inputdata);
			return false;
		};

		studentAcceptBtn.click(function(){
			var classid = $('#newStudentRequestModal #classid').val();
			var studentname = $('#newStudentRequestModal #studentname').val();

			var inputdata = {
				accept: true,
				studentname: studentname,
				classid: classid
			};

			socket.emit('studentAccept',inputdata);
			$('#newStudentRequestModal').modal('hide');
		});

		datachannelsend.onclick = sendMessage;

	}

// When both Socket and Web RTC is used

function checkIfUserSeeingThePage(){
	document.addEventListener('webkitvisibilitychange', handleVisibilityChange, false);
}

function handleVisibilityChange(){
	if(document.webkitHidden){
		if(window.popupWindow && window.isPopUpOpen){
			window.popupWindow.focus();
		}
		else
		{			var tutorStudentCommunicationWindow=window.open('','','width=200,height=100');
			setTimeout(function(){
			if(!tutorStudentCommunicationWindow || tutorStudentCommunicationWindow.closed 
				|| typeof tutorStudentCommunicationWindow == 'undefined' 
				|| typeof tutorStudentCommunicationWindow.closed == 'undefined' 
				|| tutorStudentCommunicationWindow.outerWidth===0){
				$('#popupblockerstatus').fadeIn();	
				window.isPopUpOpen = false;
			}
			else
			{
				window.popupWindow = tutorStudentCommunicationWindow;
				window.isPopUpOpen = true;
				console.log(popupWindow);
				tutorStudentCommunicationWindow.document.write("<p>This is 'myWindow'</p>");
				tutorStudentCommunicationWindow.focus();	
				tutorStudentCommunicationWindow.onblur = tutorStudentCommunicationWindow.focus();
				tutorStudentCommunicationWindow.document.addEventListener('webkitvisibilitychange', function(){
					if(document.webkitHidden){
						//alert('hidden');
						//tutorStudentCommunicationWindow.focus();
					}
				}, false);
				
			}

		},25);

		}
		
	}
	else
	{
		if(window.isPopUpOpen){
			window.isPopUpOpen = false;

		}
	}
}

//Web RTC section	


function enableWebRTC(){
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
	var constraints = {
		//audio: true, 
		video: {
			mandatory: {
				chromeMediaSource: 'screen'
			}
		}	
	};
	navigator.getUserMedia(constraints, successCallback, errorCallback);
}

function successCallback(stream){
	localStream = stream;
	var localvideo = document.querySelector("#localVideo");
	localvideo.src = window.URL.createObjectURL(stream);
	localvideo.play();
}

function errorCallback(error){
	console.log('error: '+ error);
}

function enableRTCPeerConnection(){
	var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

	var connection = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };

	window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

	peerConn  = new RTCPeerConnection(pc_config, connection);

	peerConn.onicecandidate = onIceCandidate;

	peerConn.onaddstream = onPeerAddStream;

	//Data channel
	channel = peerConn.createDataChannel('mydata',{});
	bindEventsForDataChannel();

	peerConn.addStream(localStream);

	peerConn.createOffer(setLocalAndSendMessage, errorCallback, mediaConstraints);

}

function onIceCandidate(event){
	socket.emit('message', {type:"candidate", "candidate": event.candidate});

}

function onPeerAddStream(event){
	var remotevideo = document.querySelector("#remoteVideo");
	remotevideo.src = window.URL.createObjectURL(event.stream);
}

function setLocalAndSendMessage(sessionDescription){
	console.log('session description is ' + sessionDescription);
	socket.json.send(sessionDescription);
	peerConn.setLocalDescription(sessionDescription);
}

function bindEventsForDataChannel(){
	channel.onopen = function () { console.log("Channel Open"); }
	channel.onmessage = function (e) {
		// add the message to the chat log
		//chatlog.innerHTML += "<div>Peer says: " + e.data + "</div>";
		console.log('Peer says '+ e.data );
	};
	peerConn.ondatachannel = function (e) {
			var receivechannel = e.channel;
					//bindEventsForDataChannel(); //now bind the events
				receivechannel.onmessage = function (e) {
			    	console.log("Got message:", e.data);
			};
	};

				

}

function sendMessage () {
	var msg = $('#datachanneltextbox').val();
	console.log(channel);
	channel.send(msg);
	$('#datachanneltextbox').val('');
}