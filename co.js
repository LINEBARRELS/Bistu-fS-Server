var configuration = {
   'iceServers': [{
     'url': 'stun:stun.l.google.com:19302'
   }]
 };



var pc= new webkitRTCPeerConnection(null);


pc.negoState = false;

pc.onicecandidate = function (evt) {
     if (evt.candidate){
     	so.emit('candidate',{
         'candidate': evt.candidate,
         'room':document.querySelector('#room').value
       });
     } 
     console.log('???candicate???');
 };

// pc.onsignalingstatechange = function(e){
//   console.log('change!@',e);
// }

pc.ondatachannel = function(event) {
  receiveChannel = event.channel;
  receiveChannel.onmessage = function(event) {
    console.log(event);
  };
};

var enter = document.querySelector('#enter'),
    send = document.querySelector('#send');


enter.addEventListener('click',function(e){
   so.emit('join',document.querySelector('#room').value)
   // init(pc)
})

send.addEventListener('click',function(e){
    pc.createDataChannel('nego')
    console.log('发起offer');
	pc.createOffer(sendOffer,function(e){
        console.log(e);
	})
})




function sendOffer(desc){
   pc.setLocalDescription(desc);

   so.emit('offer',{sdp:desc,room:document.querySelector('#room').value})
}

function answerOffer(desc){
	pc.setLocalDescription(desc);

	so.emit('answer',{sdp:desc,room:document.querySelector('#room').value})

}


so.on('icecandidate',  function(data) {
	
	pc.addIceCandidate(new RTCIceCandidate(data.candidate));
	console.log('new candicate!');
});

so.on('newOffer', function(data) {
	console.log('收到offer');
	pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

	pc.createAnswer(answerOffer,function(err){
		console.log(err);
	})

});

so.on('answered', function(data) {
	if(pc.negoState === false){
		console.log('响应offer');
		pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
		pc.negoState = true
	}
	
});