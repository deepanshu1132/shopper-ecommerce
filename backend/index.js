const PORT = 4000;
const express = require("express")
const app = express();
const mongoose = require("mongoose")
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const cors = require('cors')

app.use(express.json())
app.use(cors());

async function run(){

   return await mongoose.connect("mongodb://localhost:27017/ecommerce")
}
run();

app.get("/", (req, res)=>{
    res.send("Express App is running")
})

//Image Storage Engine

const storage = multer.diskStorage({
    destination: path.join(__dirname, '/upload/images'),
    filename: (req, file, cb)=>{
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage: storage})

//Creating upload endpoint for images
app.use('/images', express.static('upload/images'))

app.post('/upload', upload.single('product'), (req, res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${PORT}/images/${req.file.filename}`
    })
})

//Schema for Creating Products

const Product = mongoose.model("Product", {
    id:{
        type:Number, 
        required: String,
    },
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    new_price:{
        type:Number,
        required:true
    },
    old_price:{
        type:Number,
        required: true
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default: true
    }
})

app.post('/addproduct', async (req, res)=>{
    const products = await Product.find({})
    console.log(req.body)
    let id=0;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0]
        id= last_product.id + 1;
        console.log(id,'id')
    }
    const { image, name, category, new_price, old_price} = req.body;
    const product = new Product({
        id, name, image, category, new_price, old_price
    })
    console.log(product)
    await product.save();
    res.json({
        success: true,
        name:req.body.name
    })
})

app.post('/removeproduct', async (req, res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log('removed')
    res.json({
        success:true,
        name:req.body.name
    })
})

app.get('/allproducts', async (req, res)=>{
    const products = await Product.find({});
    console.log("All Products Fetched!")
    res.send(products)
})

//Schema creating for User model

const Users = mongoose.model('Users', {
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true
    },
    password:{
        type:String
    },
    cartData:{
        type:Object
    },
    date:{
        type:Date,
        default:Date.now()
    }
}) 

app.post('/signup', async (req, res)=>{
    const {username, email, password} = req.body;
    let check = await Users.findOne({email});
    if(check){
        return res.status(400).json({success:false, error:"Existing user found with same email address"})
    }
    let cart = {};
    for(let i = 0; i < 300; i++){
        cart[i] = 0;
    }
    const user = new Users({
        name:username,
        email,
        password,
        cartData:cart
    })
    await user.save();
    const data = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data, 'secret_ecom');
    res.json({
        success: true,
        token
    })
})

app.post('/login', async(req, res)=>{
    const {email, password} = req.body;
    let user = await Users.findOne({email})
    if(user){
        const passCompare = req.body.password == user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom')
            res.json({success:true, token})
        }else{
            res.json({success:false, errors:"Wrong Password"})
        }
    }
    else{
        res.json({success:false, errors:"Wrong Email Id"})
    }
})


app.get('/newcollections', async(req, res)=>{
    let products = await Product.find({})
    let newcollection = products.slice(1).slice(-8)
    console.log("New collection fetched")
    res.send(newcollection)
})

app.get('/popularinwomen', async (req, res)=>{
    let products = await Product.find({category: "women"})
    let popular_in_women = products.slice(0, 4);
    console.log("Popular in women fetched")
    res.send(popular_in_women)
})


const fetchUser = async (req, res, next)=>{
    console.log('first')
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }else{
        try{
            const data = jwt.verify(token, 'secret_ecom')
            req.user = data.user;
            console.log('first')
            next();
        }catch(error){
            console.log('second')
            res.status(401).send({errors:"please authenticate using a valid token"})
        }
    }
}
app.post('/addtocart', fetchUser, async(req, res)=>{
    console.log(req.body, req.user)
    let userData = await Users.findOne({_id:req.user.id})
    // console.log(req.body.itemId)
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData: userData.cartData})
    res.send({abc:"Added"})
})
app.post('/removefromcart', fetchUser, async(req, res)=>{
    let userData = await Users.findOne({_id:req.user.id})
    console.log(req)
    console.log('removed')
    if(userData.cartData[req.body.itemId]>0){
        userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData: userData.cartData})
    res.send({abc:"Added"})
})

app.post('/getcart', fetchUser, async(req, res)=>{
    console.log('get cart')
    let userData = await Users.findOne({_id:req.user.id})
    console.log(userData.cartData)
    res.json(userData.cartData);
})

app.listen(PORT, ()=>{
    console.log("Server running on port : ", PORT);
})