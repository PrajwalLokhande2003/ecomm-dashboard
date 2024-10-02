const {getDownloadURL,ref,getStorage,uploadBytes} = require('firebase/storage')
const config = require('./db/firebaseconfig')
const { initializeApp } = require('firebase/app')
const express = require('express')
const cors = require('cors')
const multer = require('multer')
require('dotenv').config()
const app = express()
require('./db/config')
const User = require('./db/user')
const Product = require('./db/products')
const path = require('path')
const Jwt = require('jsonwebtoken')
const jwtKey = process.env.JWT_TOKEN
const PORT = process.env.PORT || 5000





initializeApp(config.firebaseConfig)


const upload = multer({storage: multer.memoryStorage()})

const storage = getStorage();

// https://raw.githubusercontent.com/PrajwalLokhande2003/ecomm-dashboard/refs/heads/main/Image

app.use(cors())
app.use(express.json())

// const upload = multer({
//     storage:multer.diskStorage({
//         destination:function(req,file,cb){
//             cb(null,'./Image')
//         },
//         filename : function(req,file,cb){
//             cb(null,file.originalname)
            
    //     }
    // })
// })


// app.post('/u-image',upload.single('image'),(req,_res)=>{
//     const refstorage = ref(storage,req.file.originalname)
//        uploadBytes(refstorage,req.file.buffer).then((_snapshot)=>{
//             console.log('file uploaded');
//             console.log(req.file.originalname);
            
//         })
//         console.log(req.file);
        
// })
app.post('/add-product',upload.single('image'),async (req,res)=>{
    const refstorage = ref(storage,req.file.originalname)
       await uploadBytes(refstorage,req.file.buffer)

       

    let product = await Product.create({
        name:req.body.name,
        price:req.body.price,
        category:req.body.category,
        company:req.body.company,
        userId:req.body.userId,
        image:await getDownloadURL(refstorage,req.file.originalname)
        })

        
        // getDownloadURL(refstorage,req.file.originalname).then((url)=>{
        //     console.log(url)
        // })
        
    // let result = await product.save()
    res.send(product)
})

app.put('/update-product/:id', verifyToken,async(req,res)=>{
    let result = await Product.updateOne({_id:req.params.id},
        {$set:req.body}) 
    res.send(result)
    
})

app.put('/update-product-image/:id',upload.single('image'),async(req,res)=>{

    const refstorage = ref(storage,req.file.originalname)
       uploadBytes(refstorage,req.file.buffer)

       // let imgUrl =  getDownloadURL(refstorage,req.file.originalname)

    let result = await Product.updateOne({_id:req.params.id},{$set:{
        image:getDownloadURL(refstorage,req.file.originalname)
    }})
    res.send(result) 
})


app.post('/register',async (req,res)=>{
    let user = await User(req.body)
    let result = await user.save()
    result = result.toObject()
    delete result.password
    // res.send(result)
    Jwt.sign({result},jwtKey,{expiresIn:'8d'},(err,token)=>{
        if(err){
            res.send({result:"Somthing went to wrong, After sometime Please try again"})
        }
        res.send({result,auth:token})
    })

})
app.post('/login',async (req,res)=>{
    if(req.body.email && req.body.password){
        let user = await User.findOne(req.body).select('-password')
        if(user){
            Jwt.sign({user},jwtKey,{expiresIn:'8d'},(err,token)=>{
            if(err){
                res.send({result:"Somthing went to wrong, After sometime Please try again"})
            }
            res.send({user,auth:token})
            
        })
        // res.send(user)
        }else{
            res.send({result:"user not found"})
        }
    }else{
        res.send({result:"user not found"})
    }
    
})



app.get('/image/', verifyToken, async(_req,res)=>{
    let result = await Product.findOne({})
    let imagePath = path.join(__dirname,'../Front-End/src/components/Image',result.image)
    res.sendFile(imagePath)
    // res.send(result)
})


app.get('/products/:id', verifyToken, async (req,res)=>{
    let products = await Product.find({userId:req.params.id})
    if(products.length>0){
        res.send(products)
    }else{
        res.send({result:'no product found'})
    }
})

app.delete('/remove-product/:id', verifyToken, async(req,res)=>{
    let result = await Product.deleteOne({_id:req.params.id})
    res.send(result)
})

app.get('/product-data/:id', verifyToken,async(req,res)=>{
    let data = await Product.findOne({_id:req.params.id})
    res.send(data)
})


app.get('/search/:key', verifyToken, async(req,res)=>{
    let result = await Product.find({
        "$or":[
            {name:{$regex:req.params.key}},
            {category:{$regex:req.params.key}},
            {company:{$regex:req.params.key}}
        ]
    })
    res.send(result)
})

app.get('/user-data/:_id', verifyToken,async(req,res)=>{
    let result = await User.find(req.params)
    res.send(result)
})

app.put('/update-user/:id', verifyToken,async(req,res)=>{
    let result = await User.updateOne({_id:req.params.id},{$set:{
        name:req.body.name,
        email:req.body.email
    }})
    res.send(result) 
})

function verifyToken(req,res,next){
    let token = req.headers['authorization']
    if(token){
        Jwt.verify(token,jwtKey,(err,_valid)=>{
            if(err){
                res.status(401).send('please provide valid token')
            }else{
                next()
            }
        })

    }else{
        res.status(403).send('please add token with header')
    }
    
}

app.listen(PORT)
