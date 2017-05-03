var fs=require('fs');
var nedb=require('nedb')
var socket = require('socket.io');
var http = require('http');
var koa = require('koa');
var app = koa();
var serve = require('koa-static');
var mount = require('koa-mount');
var router = require('koa-router');
var session = require('koa-session');
var bodyParser = require('koa-bodyparser');

var app = koa();
var db=new nedb({ filename: './user.json', autoload: true }),
	torrentRecode=new nedb({ filename: './recode/recode.json', autoload: true });

var onLine={}

db.ensureIndex({fieldName:'username',unique:true},function(err){
	if(err){
		console.log(err);
	}
})


app.use(serve(__dirname+'/'))
//响应时间
var time = function *(next){
   var start = new Date();
   yield next;
   var end = new Date();
   this.set('X-Response-Time', end-start + 'ms');
  
}

var select = function (User){
  return new Promise((resolve, reject)=>{

  	if(!onLine[User.username]){


    db.find({username:User.username},(err,docs)=>{
		if(!docs[0]||err||docs[0].password!=User.password){
			reject('fuck')
		}
		resolve({loginResult:'success'})
	})  		

	}else{
		reject({loginResult:'fails'})
	}
  }).catch(function(error) {
  	return {loginResult:'fails'}
  });

};


//登录行为
var dologin=function *(){
	console.log('登录');
	var user=this.get('username'),
		pass=this.get('password')

	console.log('用户名',user);
	console.log('密码',pass);


	var User={
		username:this.get('username'),
		password:this.get('password')
	}
	this.body=yield select(User)
}
//登录状态检测
// var loginCheck=function *(next){
  
//   var sessionS = this.session.logstatus||'n';
//   var cookieS = this.cookies.get('logstatus',{signed:true})
   

//    console.log(sessionS);
//   if(sessionS.toString()!== cookieS){
//     console.log(typeof this.cookies.get('logstatus',{signed:true}));
//     console.log(typeof this.session.logstatus);
//     yield next; 
//   } 
  
  
//   this.body={loginResult:'success'}
  
  
// }

var insert = function (newUser){
  return new Promise((resolve, reject)=>{

    db.insert(newUser,(err,newDocs)=>{
		if(err){
			reject('fuck')
		}
		resolve({registResult:'success'})
	})  		
  }).catch(function(error) {
  	return {registResult:'fails'}
  });
};

//注册
var doreg=function *(next){
	console.log('注册');
	console.log('用户名',this.get('username'));
	console.log('密码',this.get('password'));
	var newUser={
		username:this.get('username'),
		password:this.get('password')
	}
	var result=yield insert(newUser)
	this.body=result
	// console.log(i);
	// i.then(function(value){
	// 	console.log(value);
	// }, function(value){
	// 	console.log(value);
	// })
}


var test = function *(){
  this.type = '.html'
  this.body=fs.readFileSync('index.html');
}

var index=new router();
index.get('',time,test);


var login= new router();

login.post('',dologin);


var regist = new router();

regist.post('',doreg)



// app.keys = ['some secret hurr'];
// app.use(session(app));


// app.use(bodyParser())
app.use(mount('/',index.routes()));
app.use(mount('/login',login.routes()))
app.use(mount('/reg',regist.routes()))




var ht = http.Server(app.callback())
ht.listen(8080)
console.log('start');

var io = socket(ht);

// var rooms=[];


io.on('connection',function(socket){
    console.log(socket.id+' connect!');

    socket.on('onLine',function(data){

    	onLine[data]=socket.id
    	console.log('有用户连接,id:',socket.id,'用户名:',data);
    })

    socket.on('disconnect',function(reason){
    	for(let i in onLine){
    		if(onLine[i]===socket.id){
    			console.log(i,' disconnect');
    			delete onLine[i]

    		}
    	}
    })

	socket.on('join',function(data){
		if(Array.isArray(data)){
			data.forEach(function(item,index){
         		socket.join(item)
				console.log(socket.id+' join! '+item);
         	})
		}else {
			socket.join(data)
		}
         
                  	
	})







	socket.on('pieceSearch',function(fileName,piece){
		console.log(fileName,piece,'块被请求');
		socket.broadcast.to(fileName).emit('broadcast',{file:fileName,piece:piece})
	})

	socket.on('pieceSearch_Result',function(data){
		console.log(data.file,data.piece,'有人回应');
		socket.broadcast.to(data.file).emit('pieceUpdate',data)
	})


	socket.on('room',function(data){
		socket.emit('rrr',socket.rooms)
	})



	socket.on('torrent',function(data){
        fs.writeFile('./torrents/'+data.missionName+'.torrent', data.torrent,(err)=>{
        	if(!err){
        		var d={
        			fileName:data.fileName,
        			missionName:data.missionName,
        			type:data.fileType
        		}
        		torrentRecode.insert(d,(err,newDocs)=>{
        			if(!err){
        				socket.emit('message','上传成功')
        			}
        		})
        	}//err
        	else{
        		console.log(err);
        	}
        });
	})


	socket.on('search',function(data){
		var reg=new RegExp(data)
         torrentRecode.find({$or: [{ fileName: reg}, { missionName: reg }]},(err,docs)=>{
         	socket.emit('searchResult',docs)
         	// console.log(docs);
         })
	})

	socket.on('searchType',function(data){
         torrentRecode.find({type:data},(err,docs)=>{
         	socket.emit('searchResult',docs)
         	// console.log(docs);
         })
	})

	socket.on('downLoad',function(data){
		console.log(socket.id,'发起下载',data);
		fs.readFile('./torrents/'+data+'.torrent', function(err,data){
			socket.emit('torrentArrive',data)
		});
	})

	socket.on('candidate', function(data) {
		 socket.to(onLine[data.to]).emit('icecandidate',data)
		 console.log(data.from+'give an candidate');
	});

	socket.on('offer', function(data) {
		 socket.to(onLine[data.to]).emit('newOffer',data)
		 console.log(socket.id+'send an offer! to',onLine[data.to]);
	});

	socket.on('answer', function(data) {
		 socket.to(onLine[data.to]).emit('answered',data)
		 console.log(socket.id+'answer!');
	});


})