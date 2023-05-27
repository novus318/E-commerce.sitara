var express = require('express');
const { render, response } = require('../app');
var router=express.Router();
var productHelper = require('../helpers/productHelpers')
const adminHelper = require('../helpers/adminHelpers')
const verifyAdmin = (req, res, next) => {
    if (req.session.admin.loggedIn) {
        next()
    } else {
        res.redirect('/admin')
    }

}

/*Get user listing*/


router.get('/', function (req, res, next) {
    res.render('admin/logina', { login: true, loginErr: req.session.adminLoginErr, admin: true })
    req.session.adminLoginErr = null
   if (req.session.admin.loggedIn) {
        productHelper.getAllPrducts().then((products) => {
            console.log(products)
            res.render('admin/viewProducts', { admin: true, products })
        })
   } else
       res.render('admin/logina', { login: true, loginErr: req.session.adminLoginErr, admin: true })
    req.session.adminLoginErr = null
})
router.post('/logina', (req, res) => {
    console.log(req.body)
   adminHelper.doLogin(req.body).then((response) => {
        if (response.status) {
            req.session.admin = response.admin
            req.session.admin.loggedIn = true
            res.redirect('/admin/viewProduct')
        } else {
            req.session.adminLoginErr = 'Invalid email or password'
            res.redirect('/admin')
        }
    })
})
router.get('/viewProduct', verifyAdmin,(req, res) => {
    productHelper.getAllPrducts().then((products) => {
        console.log(products)
        res.render('admin/viewProduct', { admin: true, products })
    })
})

router.get('/addProduct', verifyAdmin, function (req, res) {
    res.render('admin/addProduct',{admin:true})
})

router.post('/addProduct', (req, res) => {
    console.log(req.body)
    console.log(req.files.image1)

    productHelper.addProduct(req.body, (id) => {
       let image = req.files.image1
        image.mv('./public/images/product/' + id + '.jpg', (err, done) => {
          if (!err)
         res.redirect('/admin')
          else
              console.log(err);
      })
    
})
})
router.get('/out', (req, res) => {
    req.session.destroy()
    res.redirect('/admin')

})

router.get('/edit-product/:id', async(req, res) => {
    let product = await productHelper.getProductDetails(req.params.id)
    res.render('admin/editProduct', { product })
})
router.get('/delete-product/:id', function (req, res) {
     let proId = req.params.id
    productHelper.deleteProduct(proId).then((response)=> {
        res.redirect('/admin/')
    })
})
router.post('/editProduct/:id', (req, res) => {
    productHelper.updateProduct(req.params.id, req.body).then(() => {
        res.redirect('/admin')
        if (req.files.image1) {
            let image = req.files.image1
            image.mv('./public/images/product/' + req.params.id + '.jpg')
        }
    })
})
module.exports=router;