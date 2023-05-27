

function addCart(proId) {
	$.ajax({
		url: "/addCart/" + proId,
		method: 'get',
		success: (response) => {
			if (response.status) {
				let count = $('#count').html()
				count = parseInt(count) + 1
				$(count).html(count)
			}
		}
	}) 
}
function changeQuantity(cartId, proId,userId, count) {
	let quantity = parseInt(document.getElementById(proId).innerHTML)
	count = parseInt(count)
	let text = document.getElementById(proId).innerHTML
	if (text == 1) {
		document.getElementById("button").disabled = true
	}
	$.ajax({
		url: '/changeQuantity',
		data: {
			user: userId,
			cart: cartId,
			product: proId,
			count: count,
			quantity: quantity
		},
		method: 'post',
		success: (response) => {

			if (response.removeProduct) {
				alert("product is removed from cart")
				location.reload()
			} else  {
				document.getElementById(proId).innerHTML = quantity + count
				document.getElementById('total').innerHTML = response.total
			}
		}
	})
}
function removeButton(cartId, proId) {
	$.ajax({
		url: '/removeButton',
		data: {
			cart: cartId,
			product: proId,
		},
		method: 'post',
		success: (response) => {
			if(remove)
			location.reload()
		}
	})
}
