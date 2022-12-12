import express from 'express';
import {
  validateReqBody,
  isObject,
  firstToUpperCase,
  isNull,
  validateId,
  clientSafeItems,
} from '../lib/helpers.js';
import Items from '../db/models/Items.js';
import Users from '../db/models/Users.js';
const router = express.Router();

router.post('/', async (req, res) => {
  if (
    !validateReqBody({
      body: req.body,
      expectedProperties: ['token'],
    })
  )
    res.json({ result: false, error: 'Invalid token' });
  else {
    const { token } = req.body;
    const user = await Users.findOne({ token });

    if (!user) {
      res.json({ result: false, error: 'Invalid token' });
      return;
    }

    if (user.userItems.length > 0) await user.populate('userItems');

    res.json({
      result: true,
      items: user.userItems,
    });
  }
});

router.post('/add', async (req, res) => {
  console.log(req.body);
  if (
    !validateReqBody({
      body: req.body,
      expectedProperties: [
        'token',
        'category',
        'address',
        'details',
        'authentication',
        'declared',
      ],
      allowNull: true,
    })
  )
    res.json({ result: false, error: 'Invalid token or item data' });
  else {
    const { token, category, address, details, authentication, declared } = req.body;
    const user = await Users.findOne({ token });

    if (!user) {
      res.json({ result: false, error: 'Invalid token' });
      return;
    }

    if (await Items.findOne({ category: firstToUpperCase(category), declared })) {
      res.json({
        result: false,
        error: 'An item of this category was declared with the same date',
      });
      return;
    }

    const item = new Items({
      category: firstToUpperCase(category),
      details: isObject(details) ? details : null,
      address: !isNull(address) ? address : null,
      authentication: isObject(authentication) ? authentication : null,
      userId: user._id,
      declared,
    });

    try {
      await user.userItems.push(item._id);
      await item.save();
      await user.save();
    } catch {
      res.json({ result: false, error: 'Failed to add item to user' });
      return;
    }

    await user.populate('userItems');

    res.json({
      result: true,
      user: {
        token: user.token,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        items: clientSafeItems(user),
      },
    });
  }
});

router.delete('/remove', async (req, res) => {
  if (
    !validateReqBody({
      body: req.body,
      expectedProperties: ['token', 'id'],
    })
  )
    res.json({ result: false, error: 'Invalid token or item data' });
  else {
    const { token, id } = req.body;
    const user = await Users.findOne({ token });

    if (!user) {
      res.json({ result: false, error: 'Invalid token' });
      return;
    }

    if (!validateId(id)) {
      res.json({ result: false, error: 'ID is invalid' });
      return;
    }

    const item = await Items.findById(id);

    if (!item) {
      res.json({
        result: false,
        error: 'Item not found',
      });
      return;
    }

    if (String(item.userId) !== String(user._id)) {
      res.json({ result: false, error: 'User unauthorized to remove item' });
      return;
    }

    try {
      user.userItems = user.userItems.filter((item_id) => String(item_id) !== id);
      await user.save();
      await item.remove();
    } catch {
      res.json({ result: false, error: 'Failed to add item to user' });
      return;
    }

    res.json({
      result: true,
      user: clientSafeItems(user),
    });
  }
});

router.put('/update-status', async (req, res) => {
  if (
    !validateReqBody({
      body: req.body,
      expectedProperties: ['token', 'id', 'isFound'],
    })
  )
    res.json({ result: false, error: 'Invalid token or data' });
  else {
    const { token, id, isFound } = req.body;
    const user = await Users.findOne({ token });

    if (!user) {
      res.json({ result: false, error: 'Invalid token' });
      return;
    }

    if (!validateId(id)) {
      res.json({ result: false, error: 'ID is invalid' });
      return;
    }

    if (typeof isFound !== 'boolean') {
      res.json({ result: false, error: 'isFound must be of type boolean' });
      return;
    }

    const item = await Items.findById(id);

    if (!item) {
      res.json({
        result: false,
        error: 'Item not found',
      });
      return;
    }

    if (String(item.userId) !== String(user._id)) {
      res.json({ result: false, error: 'User unauthorized to edit item' });
      return;
    }

    try {
      item.isFound = isFound;
      item.save();
    } catch {
      res.json({ result: false, error: 'Failed to update items isFound field' });
      return;
    }

    res.json({
      result: true,
    });
  }
});

router.put('/update-details', async (req, res) => {
  if (
    !validateReqBody({
      body: req.body,
      expectedProperties: ['token', 'id', 'details'],
    })
  )
    res.json({ result: false, error: 'Invalid token or data' });
  else {
    const { token, id, details } = req.body;
    const user = await Users.findOne({ token });

    if (!user) {
      res.json({ result: false, error: 'Invalid token' });
      return;
    }

    if (!validateId(id)) {
      res.json({ result: false, error: 'ID is invalid' });
      return;
    }

    if (!isObject(details)) {
      res.json({ result: false, error: 'details must be an object with properties' });
      return;
    }

    if (Object.values(details).some((val) => isNull(val))) {
      res.json({ result: false, error: 'No null values in details' });
      return;
    }

    const item = await Items.findById(id);

    if (!item) {
      res.json({
        result: false,
        error: 'Item not found',
      });
      return;
    }

    if (String(item.userId) !== String(user._id)) {
      res.json({ result: false, error: 'User unauthorized to edit item' });
      return;
    }

    try {
      item.details = details;
      item.save();
    } catch {
      res.json({ result: false, error: 'Failed to update items details field' });
      return;
    }
    res.json({
      result: true,
    });
  }
});

router.put('/update-locationinfo', async (req, res) => {
  if (
    !validateReqBody({
      body: req.body,
      expectedProperties: ['token', 'id', 'locationInfo'],
    })
  )
    res.json({ result: false, error: 'Invalid token or data' });
  else {
    const { token, id, locationInfo } = req.body;

    const user = await Users.findOne({ token });

    if (!user) {
      res.json({ result: false, error: 'Invalid token' });
      return;
    }

    if (!validateId(id)) {
      res.json({ result: false, error: 'ID is invalid' });
      return;
    }

    if (!isObject(locationInfo)) {
      res.json({
        result: false,
        error: 'locationInfo must be an object with properties',
      });
      return;
    }

    if (Object.values(locationInfo).some((val) => isNull(val))) {
      res.json({ result: false, error: 'No null values in locationInfo' });
      return;
    }

    const item = await Items.findById(id);

    if (!item) {
      res.json({
        result: false,
        error: 'Item not found',
      });
      return;
    }

    if (String(item.userId) !== String(user._id)) {
      res.json({ result: false, error: 'User unauthorized to edit item' });
      return;
    }

    try {
      item.locationInfo = locationInfo;
      item.save();
    } catch {
      res.json({ result: false, error: 'Failed to update items locationInfo field' });
      return;
    }
    res.json({
      result: true,
    });
  }
});

router.put('/update-authentication', async (req, res) => {
  if (
    !validateReqBody({
      body: req.body,
      expectedProperties: ['token', 'id', 'authentication'],
    })
  )
    res.json({ result: false, error: 'Invalid token or data' });
  else {
    const { token, id, authentication } = req.body;

    const user = await Users.findOne({ token });

    if (!user) {
      res.json({ result: false, error: 'Invalid token' });
      return;
    }

    if (!validateId(id)) {
      res.json({ result: false, error: 'ID is invalid' });
      return;
    }

    if (!isObject(authentication)) {
      res.json({
        result: false,
        error: 'authentication must be an object with properties',
      });
      return;
    }

    if (Object.values(authentication).some((val) => isNull(val))) {
      res.json({ result: false, error: 'No null values in authentication' });
      return;
    }

    const item = await Items.findById(id);

    if (!item) {
      res.json({
        result: false,
        error: 'Item not found',
      });
      return;
    }

    if (String(item.userId) !== String(user._id)) {
      res.json({ result: false, error: 'User unauthorized to edit item' });
      return;
    }

    try {
      item.authentication = authentication;
      item.save();
    } catch {
      res.json({ result: false, error: 'Failed to update items authentication field' });
      return;
    }
    res.json({
      result: true,
    });
  }
});

export default router;
