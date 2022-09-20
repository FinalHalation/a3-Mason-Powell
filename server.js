const express = require( 'express' ),
    mongodb = require( 'mongodb' ),
    cookie  = require( 'cookie-session' ),
    bodyParser = require("body-parser"),
    responseTime = require("response-time"),
    timeout = require('connect-timeout'),
    app = express()

app.use( express.static('public') )
app.use( express.json() )
app.use( responseTime() )
app.use(timeout('8000s'))
app.use(haltOnTimedout)
const path = require('path');

function haltOnTimedout (req, res, next) {
    if (!req.timedout) next()
}

app.use( express.urlencoded({ extended:true }) )


app.use( cookie({
    name: 'session',
    keys: ['ThisIsNotAkey', 'ThisIsNotACookiekey']
}))

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/views/login.html'));
});

app.get('/index.html', function(req, res) {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});

app.get('/login.html', function(req, res) {
    res.sendFile(path.join(__dirname, '/views/login.html'));
});

const uri = "mongodb+srv://admin:admin@cluster0.wqjmlvr.mongodb.net/?retryWrites=true&w=majority";

const client = new mongodb.MongoClient( uri, { useNewUrlParser: true, useUnifiedTopology:true })
let collection = null

client.connect()
    .then( () => {
        return client.db( 'database' ).collection( 'collection' )
    })
    .then( __collection => {
        collection = __collection
        console.log(collection)
        return collection.find({ }).toArray()
    })
    .then( console.log )

app.get('/data', (req, res) => {
    if (collection !== null) {
        collection.find({username: user}).toArray().then(result => res.json(result));
    }
});

app.post( '/add', (req,res) => {
    // assumes only one object to insert
    req.body['username'] = user
    collection.insertOne( req.body )
        .then( insertResponse => collection.findOne(insertResponse.insertedId) )
        .then( findResponse => res.json( findResponse))
})

app.post( '/remove', (req,res) => {
    console.log(req.body)
    collection
        .deleteOne({ _id:mongodb.ObjectId( req.body.id ) })
        .then( result => res.json( result ) )
})

app.post( '/update', (req,res) => {
    console.log(res.body)
    collection
        .updateOne(
            { _id:mongodb.ObjectId( req.body.id ) },
            { $set:{ assignment:req.body.assignment,
                    subject:req.body.subject,
                    dead_line: req.body.dead_line} }
        )
        .then( insertResponse => collection.findOne(insertResponse.insertedId) )
        .then( findResponse => res.json( findResponse))
})


const client2 = new mongodb.MongoClient( uri, { useNewUrlParser: true, useUnifiedTopology:true })
let loginCollection = null;
client2.connect()
    .then( () => {
        return client2.db( 'testdata' ).collection( 'users' )
    })
        loginCollection = __collection
        loginCollection.createIndex({"username": 1}, {unique: true})

    })
    .then( console.log )
let user = null;

app.post("/login", bodyParser.json(), function(req, res) {
    console.log(req.body)
    loginCollection
        .find({ username: req.body.username, password: req.body.password })
        .toArray()
        .then(result => {
            if(result.length === 1) {
                req.session.login = true
            }
            res.json(result)
        });
    user = req.body.username;
});

app.post("/create", bodyParser.json(), function(req, res) {
    user = req.body.username;
    loginCollection.insertOne( req.body )
        .then( insertResponse => loginCollection.findOne(insertResponse.insertedId) )
        .then( findResponse => res.json( findResponse))
        .catch(err => {
            console.log(err)
            res.status(500).json()
        })

});

app.use( function( req,res,next) {
    if( req.session.login === true )
        next()
    else
        res.sendFile( __dirname + '/views/login.html' )
})

app.post("/logout", bodyParser.json(), function(req, res) {
    user = null;
});

app.listen(process.env.PORT || 3000 )
