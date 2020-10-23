const mongoose = require('mongoose')
const Store = mongoose.model('Store')
const multer = require('multer')
const jimp = require('jimp')
const uuid = require('uuid')
const { response } = require('express')

const multerOptions = {
  storage: multer.memoryStorage(), // not saving actual file, will save resized & optimized file
  fileFilter: (req, file, next) => {
    const isPhoto = file.mimetype.startsWith('image/')
    if (isPhoto) {
      next(null, true)
    } else {
      next({ message: "file type not allowed." }, false)
    }
  }
}

exports.homepage = (req, res) => {
  res.render('index')
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' })
}

// photo upload middleware
exports.upload = multer(multerOptions).single('photo')

// photo upload middleware
exports.resize = async (req, res, next) => {
  // check for file to resize first
  if (!req.file) {
    next()
    return
  }

  const extension = req.file.mimetype.split('/')[1]
  req.body.photo = `${uuid.v4()}.${extension}` // put photo in req object for createStore to use

  // resizing
  const photo = await jimp.read(req.file.buffer)
  await photo.resize(800, jimp.AUTO)
  await photo.write(`./public/uploads/${req.body.photo}`)

  next()
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id
  const store = await (new Store(req.body)).save()
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`)
  res.redirect(`/store/${store.slug}`)
}

exports.getStores = async (req, res) => {
  const stores = await Store.find().lean()
  res.render('stores', { title: 'Stores', stores })
}

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!')
  }
}

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id }).lean()
  confirmOwner(store, req.user)
  res.render('editStore', { title: `Edit ${store.name}`, store })
}

exports.updateStore = async (req, res) => {
  const { id } = req.params
  const store = await Store.findOneAndUpdate({ _id: id }, req.body, {
    new: true, // will return the newly created store, defaults is to return the old store
    runValidators: true, // doesn't run validation by default when updating
  }).exec()
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`)
  res.redirect(`/stores/${store._id}/edit`)
}

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).lean().populate('author')

  if (!store) {
    return next()
  }
  res.render('store', { store, title: store.name })
}

exports.getStoresByTag = async (req, res, next) => {
  const tag = req.params.tag
  const tagQuery = tag || { '$exists': true }

  const tagsPromise = Store.getTagsList()
  const storesPromise = Store.find({ tags: tagQuery })

  const [tags, stores] = await Promise.all([ tagsPromise, storesPromise ])


  res.render('tags', { tags, stores, tag, title: 'Tags' })
}

exports.searchStores = async (req, res) => {
  const stores = await Store.find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' }
  }).limit(5)

  res.json(stores)
}