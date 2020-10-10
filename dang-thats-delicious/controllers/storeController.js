const mongoose = require('mongoose')
const Store = mongoose.model('Store')

exports.homepage = (req, res) => {
  console.log(req.name)
  res.render('index')
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' })
}

exports.createStore = async (req, res) => {
  console.log('createStore?')
  const store = await (new Store(req.body)).save()
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`)
  res.redirect(`/store/${store.slug}`)
}

exports.getStores = async (req, res) => {
  const stores = await Store.find().lean()
  res.render('stores', { title: 'Stores', stores })
}

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id }).lean()
  res.render('editStore', { title: `Edit ${store.name}`, store })
}

exports.updateStore = async (req, res) => {
  console.log('updateStore?')
  const { id } = req.params
  const store = await Store.findOneAndUpdate({ _id: id }, req.body, {
    new: true, // will return the newly created store, defaults is to return the old store
    runValidators: true, // doesn't run validation by default when updating
  }).exec()
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`)
  res.redirect(`/stores/${store._id}/edit`)
}