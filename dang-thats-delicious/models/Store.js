const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const slug = require('slugs')

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!!!'
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [],
  photo: String,
})

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next()
    return
  }
  this.slug = slug(this.name)

  // find other stores that have the same slug: slug, slug-1, slug-2, etc
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i')
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx })
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`
  }

  next()
  // TODO make sure slugs unique
})

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])
}

module.exports = mongoose.model('Store', storeSchema)