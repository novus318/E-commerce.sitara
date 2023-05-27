var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('../app')
const Razorpay = require('razorpay')
const { resolve } = require('dns')
const { ORDER_COLLECTION } = require('../config/collections')
let instance = new Razorpay({
    key_id: 'rzp_test_MBykg16J56YPby',
    key_secret: 'Y0Qz0nKQjoL1ymAJqfP3nEi2',
})
var ObjectId = require('mongodb').ObjectId
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log('login success')
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login failed')
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('user not found')
                resolve({ status: false })
            }

        })
    },
    addCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (userCart) {
                console.log('got it')
                let proExist = userCart.products.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({
                        user: new ObjectId(userId),'products.item': new ObjectId(proId)
                    },
                        { $inc: { 'products.$.quantity': 1 } }
                    ).then(() => {
                        resolve()
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId) },
                        {
                            $push: { products: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })
                }

            } else {
                console.log('found')
                let cartObj = {
                    user: new ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([{
                $match: { user: new ObjectId(userId) }
            },
            {
                $unwind: '$products'
            },
            {
                $project: {
                    item: '$products.item',
                    quantity: '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $project: {
                    item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                }
            }
            ]).toArray()
            console.log(cartItems)
            resolve(cartItems)
        })
    },
    cartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(details.cart) },
                    {
                        $pull: { products: { item: new ObjectId(details.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({
                    _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product)
                },
                    { $inc: { 'products.$.quantity': details.count } }
                ).then((response) => {
                    resolve({ status: true })
                })
            }
            })
    },
    removeButton: (details) => {
        console.log(details)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new ObjectId(details.cart) },
                {
                    $pull: { products: { item: new ObjectId(details.product) } }
                }
            ).then((response) => {
                resolve({ remove: true })
            })
        })
    },
    getTotal: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([{
                $match: { user: new ObjectId(userId) }
            },
            {
                $unwind: '$products'
            },
            {
                $project: {
                    item: '$products.item',
                    quantity: '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $project: {
                    item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                }
                },
                {
                    $group: {
                        _id:null,
                        total: { $sum: { $multiply: [{ $toInt: "$quantity" }, { $toInt: "$product.Price" }] } }
                    }
                }
            ]).toArray()
                resolve(total[0].total)
           
        })
    },
    placeOrder: (order,products,total) => {
        return new Promise((resolve, reject) => {
            let status = order.method === 'COD' ? 'Ready to ship' : 'Payment pending'
            let orderObj = {
                address: {
                    fname: order.fname,
                    sname: order.sname,
                    mobile: order.number,
                    place: order.address,
                    near: order.landmark,
                    city: order.city,
                    state: order.state,
                    pin:order.pincode,

                },
                userId: new ObjectId(order.userId),
                payment: order.method,
                products: products,
                Total:total,
                status: status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                resolve(response.insertedId)
            })
        })
    },
    getCartList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            resolve(cart.products)
        })
    },
    orderList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray()
            resolve(orders)
        })
    },
    getOrderedProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                $match: { _id: new ObjectId(orderId) }
            },
            {
                $unwind: '$products'
            },
            {
                $project: {
                    item: '$products.item',
                    quantity: '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $project: {
                    item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                }
            }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId,total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount:total*100,
                currency: "INR",
                receipt: ""+orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log("e", order);
                resolve(order)
            });

        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require("crypto");
            let hash = crypto.createHmac('sha256', 'Y0Qz0nKQjoL1ymAJqfP3nEi2')
            hash.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hash = hash.digest('hex');
            if (hash == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changeStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new ObjectId(orderId) },
                {
                    $set: {
                        status:'Ready to ship'
                    }
                }
            ).then(() => {
                resolve()
            })
        })
    },
    deleteCart: (userId) => {
        db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(userId) })
    }

}