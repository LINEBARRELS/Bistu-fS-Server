(function(window){

   window.so = io()
 
   // var s= document.querySelector('#send')

   // s.addEventListener('click',function(e){


   // 	  so.emit('message',document.querySelector('#va').value)
   // })

   so.on('message',function(data){
       console.log(data);
   })

   so.on('roommess',function(data){
       console.log('房间内来信:'+data);
   })





})(window)