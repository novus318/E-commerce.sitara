const { response } = require('express');
var express = require('express');
const session = require('express-session');
var router = express.Router();
var db = require('../config/connection')
var collection = require('../config/collections')
var ObjectId = require('mongodb').ObjectId
const productHelper = require('../helpers/productHelpers')
const userHelper = require('../helpers/userHelpers')
const verifyLogin = (req, res,next) => {
    if (req.session.userLoggedIn) {
        next()
    } else {
        res.redirect('/login')
    }
    
}


/* GET home page. */
router.get('/', async function (req, res, next) {
    let user = req.session.user
    let Count = null
    if (req.session.user) {
        Count = await userHelper.cartCount(req.session.user._id)
    }
    res.render('user/index', { use: true, user, Count })
    })



router.get('/user/products', verifyLogin, async function (req, res, next) {
    let user = req.session.user
    let Count = null
    if (req.session.user) {
        Count = await userHelper.cartCount(req.session.user._id)
    }
    productHelper.getAllPrducts().then((products) => {
        console.log(products)
        res.render('user/products', { use: true, products, user, Count })
    })
})

router.get('/login', (req, res) => {
    if (req.session.userLoggedIn)
        res.redirect('/')
    else
        res.render('user/login', { login: true, loginErr: req.session.userLoginErr })
    req.session.userLoginErr = null
})
router.get('/signup', (req, res) => {
    res.render('user/signup', { login: true })
   

})

router.post('/user/signup', (req, res) => {
    userHelper.doSignup(req.body).then((response) => {
        req.session.userLoggedIn = true
        req.session.user = response  
        res.redirect('/')
    })
})
router.post('/user/login', (req, res) => {
    userHelper.doLogin(req.body).then((response) => {
        if (response.status) {
            req.session.user = response.user
            req.session.userLoggedIn = true
            res.redirect('/')
        } else {
            req.session.userLoginErr='Invalid email or password'
            res.redirect('/login')
            }
        })
})
router.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/')
    
})
router.get('/cart', verifyLogin, async (req, res) => {
    let Count = null
    if (req.session.user) {
        Count = await userHelper.cartCount(req.session.user._id)
    }
    let user = req.session.user
    let total = 0
    let products = null
    let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(req.session.user._id) })
    if (cart) {
        products = await userHelper.getCartProducts(req.session.user._id)
        if (products.length>0) {
            total = await userHelper.getTotal(user._id)
            res.render('user/cart', { user, use: true, products, Count, total })
        }
        res.render('user/cart', { user, use: true, products, Count, total })
    } else
    res.render('user/cart', { user, use: true, Count})
})
router.get('/addCart/:id',(req, res) => {
    userHelper.addCart(req.params.id, req.session.user._id).then(() => {
        res.json({ status: true })
    })
})
router.post('/changeQuantity', (req, res, next) => {
    userHelper.changeQuantity(req.body).then(async (response) => {
        response.total = await userHelper.getTotal(req.body.user)
        res.json(response)
    })
})
router.post('/removeButton', (req, res) => {
    userHelper.removeButton(req.body).then((response) => {
        res.json(response)
    })
})
router.get('/placeOrder', verifyLogin, async (req, res) => {
    let user = req.session.user
    let total = await userHelper.getTotal(user._id)
    res.render('user/placeOrder', { use: true,user,total })
})

router.post('/place-Order', async (req, res) => {
    let products = await userHelper.getCartList(req.body.userId)
    let total = await userHelper.getTotal(req.body.userId)
    userHelper.placeOrder(req.body, products, total).then((orderId) => {
        if (req.body.method == 'COD') {
            res.json({ codSuccess: true })
           
        } else {
            userHelper.generateRazorpay(orderId, total).then((response) => {
                res.json(response)
            })
        }
    })
})
router.get('/orderPlaced', verifyLogin, (req, res) => {
    let user = req.session.user
    userHelper.deleteCart(user._id)
    res.render('user/orderPlaced', { use: true, place: true})
    console.log(user)
})
router.get('/orderFailed', verifyLogin, (req, res) => {
    res.render('user/orderFailed', { use: true, place: true})
})
router.get('/viewOrder', verifyLogin, async (req, res) => {
    let user = req.session.user
    let Count = await userHelper.cartCount(req.session.user._id)
    let orders = await userHelper.orderList(req.session.user._id)
    console.log(orders)
    res.render('user/viewOrder', { use: true, user, Count, orders })
})
router.get('/orderProducts/:id', verifyLogin, async (req, res) => {
    let user = req.session.user
    let products = await userHelper.getOrderedProducts(req.params.id)
    res.render('user/orderProducts', { use: true, user, products })
})
router.post('/verifyPayment', (req, res) => {
    userHelper.verifyPayment(req.body).then(() => {
        userHelper.changeStatus(req.body['order[receipt]']).then(() => {
            res.json({ status: true })
        })
    }).catch((err) => {
        res.json({ status: false,errMsg:''})
    })
})

module.exports = router;