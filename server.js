//create express app
const express = require("express");
const _server = express();

//add modules
const _path = require("path");
const _blogService = require("./blog-service");
const multer = require("multer");
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier');
const upload = multer(); // no { storage: storage } since we are not using disk storage
const exphbs = require('express-handlebars');
const stripJs = require('strip-js');

cloudinary.config({
    cloud_name: 'ditgfy779',
    api_key: '491122215765764',
    api_secret: 'Bj-gmH3D9nxJ7c-68oJ80GwtC6U',
    secure: true
});

//handlebars engine
_server.engine('.hbs', exphbs.engine({ 
    extname: '.hbs', 
    defaultLayout: 'main',
    helpers: {
        navLink: function(url, options){
            return '<li' + 
                ((url == _server.locals.activeRoute) ? ' class="active" ' : '') + 
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function(context){
            return stripJs(context);
        },
        formatDate: function(dateObj){
            let year = dateObj.getFullYear();
            let month = (dateObj.getMonth() + 1).toString();
            let day = dateObj.getDate().toString();
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
        }
        
    }
}));

_server.set('view engine', '.hbs');

const HTTP_PORT = process.env.PORT || 8080;
_server.use(express.static('public')); //use of css

function onHttpStart() {
    console.log("Express http server listening on port: " + HTTP_PORT);
}

_server.use(function(req,res,next){
    let route = req.path.substring(1);
    _server.locals.activeRoute = (route == "/") ? "/" : "/" + route.replace(/\/(.*)/, "");
    _server.locals.viewingCategory = req.query.category;
    next();
});

//home page
_server.get("/", (req, res) => {
    res.redirect('/blog');
});

//about author
_server.get("/about", (req, res) => {
    
    res.render('about', {
        data: null,
        layout: 'main.hbs' // do not use the default Layout (main.hbs)
    });
});

//get published posts
_server.get('/blog', async (req, res) => {

    // Declare an object to store properties for the view
    let viewData = {};

    try{

        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if(req.query.category){
            // Obtain the published "posts" by category
            posts = await _blogService.getPublishedPostsByCategory(req.query.category);
        }else{
            // Obtain the published "posts"
            posts = await _blogService.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        // get the latest post from the front of the list (element 0)
        let post = posts[0]; 

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;
        viewData.post = post;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        // Obtain the full list of "categories"
        let categories = await _blogService.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    // render the "blog" view with all of the data (viewData)
    res.render("blog", {data: viewData})

});

//get all posts
_server.get("/posts", (req, res) => {
    if(req.query.category){
        _blogService.getPostsByCategory(req.query.category).then((data) => {
            res.render("posts", {posts:data});
        }).catch((err) => {
            res.render("posts", {message: "no results"});
        })
    } else if(req.query.minDate) {
        _blogService.getPostsByMinDate(req.query.minDate).then((data) => {
            res.render("posts", {posts:data});
        }).catch((err) => {
            res.render("posts", {message: "no results"});
        })
    } else {
        _blogService.getAllPosts().then((data) => {
            res.render("posts", {posts:data});
        }).catch((err) => {
            res.render("posts", {message: "no results"});
        })
    }
});

//add post
_server.get("/posts/add", (req, res) => {
    //res.sendFile(_path.join(__dirname, './views/addPost.html'));
    res.render('addPost', {
        data: null,
        layout: 'main.hbs' // do not use the default Layout (main.hbs)
    });
});

//get all categories
_server.get("/categories", (req, res) => {
    _blogService.getCategories().then((data) => {
        res.render("categories", {categories:data});
    }).catch((err) => {
        res.render("categories", {message: "no results"})
    })
});

//get post by id
_server.get('/blog/:id', async (req, res) => {

    // Declare an object to store properties for the view
    let viewData = {};

    try{

        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if(req.query.category){
            // Obtain the published "posts" by category
            posts = await _blogService.getPublishedPostsByCategory(req.query.category);
        }else{
            // Obtain the published "posts"
            posts = await _blogService.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        // Obtain the post by "id"
        viewData.post = await _blogService.getPostById(req.params.id);
    }catch(err){
        viewData.message = "no results"; 
    }

    try{
        // Obtain the full list of "categories"
        let categories = await blogData.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    // render the "blog" view with all of the data (viewData)
    res.render("blog", {data: viewData})
});

//add post and image and save it to cloudinary
_server.post("/posts/add",upload.single("featureImage") , (req, res) => {
    let streamUpload = (req) => {
        return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
                (error, result) => {
                    if (result) {
                        resolve(result);
                     } else {
                        reject(error);
                    }
                }
            );
    
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
    };
    
    async function upload(req) {
        let result = await streamUpload(req);
        console.log(result);
        return result;
    }
    
    upload(req).then((uploaded)=>{
        req.body.featureImage = uploaded.url;
    
        _blogService.addPost(req.body).then(() => {
            res.redirect('/posts')
        }).catch((error) => {
            res.status(500).send(error)
        });
    });
});




//init app
_blogService.initialize().then(() => {
    _server.listen(HTTP_PORT, onHttpStart);
}).catch((err) => {
    console.log(err);
    res.status(404).send("File couldn't be read");
})

