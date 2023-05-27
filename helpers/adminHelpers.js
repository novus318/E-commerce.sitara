// JavaScript source code
const bcrypt = require('bcrypt');
const collections = require('../config/collections');
var db = require('../config/connection')


var ObjectId = require('mongodb').ObjectId
module.exports = {
    doLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let admin = await db.get().collection(collections.ADMIN_COLLECTION).findOne({ email: adminData.email })
            if (admin) {
                bcrypt.compare(adminData.password, admin.password).then((status) => {
                    if (status) {
                        console.log('login success')
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login failed')
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('admin not found')
                resolve({ status: false })
            }

        })
    }
}