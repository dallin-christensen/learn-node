const passport = require('passport')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const crypto = require('crypto')
const promisify = require('es6-promisify')

exports.login = passport.authenticate('local',{
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!',
})

exports.logout = (req, res) => {
  req.logout()
  req.flash('success', 'You are now logged out!')
  res.redirect('/')
}

exports.isLoggedIn = (req, res, next) =>  {
  if(req.isAuthenticated()) {
    next()
    return
  }
  req.flash('error', 'Oops! You must be logged in!')
  res.redirect('/login')
}

exports.forgot = async (req, res, next) => {
  // 1. see if user with that email exists
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    req.flash('success', 'A password reset has been mailed to you.') // technically this is a lie, but we don't want to tell a possiby malicious user about our email data.
    return res.redirect('/login')
  }

  // 2. set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex')
  user.resetPasswordExpires = Date.now() + 3600000
  await user.save()

  // 3. send them an email with token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
  req.flash('success', `A password reset has been mailed to you. ${resetURL}`)

  // 4. redirect them to login page.
  return res.redirect('/login')
}

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  })

  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired')
    return res.redirect('/login')
  }

  res.render('reset', { title: 'Reset your Password' })
}

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next()
    return
  }
  req.flash('error', 'Passwords do not match!')
  res.redirect('back')
}

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  })

  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired')
    return res.redirect('/login')
  }

  const setPassword = promisify(user.setPassword, user)
  await setPassword(req.body.password)

  user.resetPasswordExpires = undefined
  user.resetPasswordToken = undefined

  const updatedUser = await user.save()
  await req.login(updatedUser)

  req.flash('success', 'Success! Password updated!')
  res.redirect('/')
}