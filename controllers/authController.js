import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import '../config/config.js';
import crypto from 'crypto';
import url from 'url';
import { Op } from 'sequelize';
import User from '../models/userModel.js';
import openRoutes from '../config/openRoutes.js';
// eslint-disable-next-line import/no-named-as-default, import/no-named-as-default-member
import restaurantClient from '../client/restaurantClient.js';
import logger from '../utils/logger/logger.js';

const authController = {
  // POST /api-auth/register
  register: async (req, res) => {
    if (!req.body || !req.body.firstName || !req.body.lastName || !req.body.email || !req.body.password) {
      return res.status(400).json({
        message: 'Informations manquantes',
      });
    }

    // check if username or email already exists
    const userExists = await User.findOne({
      where: { email: req.body.email },
    });

    if (userExists) {
      return res.status(400).json({
        message: 'Email déjà utilisé',
      });
    }

    // If a partner code is provided, find the partner
    const partner = req.body.partnerCode
      ? await User.findOne({ where: { partnerCode: req.body.partnerCode } })
      : null;

    // If a partner code is provided but no partner is found or the partner have another role, return an error
    if ((req.body.partnerCode && !partner) || (partner && partner.role !== req.body.role)) {
      return res.status(400).json({
        message: 'Code de parainnage invalide',
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // generate partner code
    let partnerCode;
    do {
      partnerCode = crypto.randomBytes(5).toString('hex'); // generate a new 10-character code
      // eslint-disable-next-line no-await-in-loop
    } while (await User.findOne({ where: { partnerCode } }));

    // create new user
    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      role: req.body.role,
      password: hashedPassword,
      partnerCode,
      partnerId: partner?.id,
      restaurantId: null,
    });

    try {
      await user.save();
      logger.log('connection', 'Utilisateur enregistré', { userID: user.id });
      return res.status(200).json({ id: user.id, message: 'Votre compte a été créé' });
    } catch (err) {
      return res.status(400).json({ message: err });
    }
  },
  // POST /api-auth/login
  login: async (req, res) => {
    logger.log('connection', 'Demande de connexion', { userEmail: req.body.email });
    // check if username exists
    const user = await User.findOne({ where: { email: req.body.email } });

    if (!user) {
      logger.log('connection', 'Utilisateur non trouvé', { userEmail: req.body.email });
      return res.status(400).json({
        message: 'Email ou mot de passe incorrect',
      });
    }

    // check if user is blocked
    if (user.isBlocked) {
      logger.log('connection', 'Utilisateur bloqué', { userID: user.id });
      return res.status(400).json({
        message: 'Votre compte a été bloqué',
      });
    }

    // check if password is correct
    const validPassword = await bcrypt.compare(req.body.password, user.password);

    if (!validPassword) {
      logger.log('connection', 'Mot de passe incorrect', { userID: user.id });
      return res.status(400).json({
        message: 'Email ou mot de passe incorrect',
      });
    }

    if (user.role === 'restaurant') {
      logger.log('info', 'Récupération restaurant', { userID: user.id });
      const restaurant = await restaurantClient.getRestaurantByCreatorId(user.id);
      user.restaurant = restaurant ? restaurant._id : null;
    }

    // create and assign a token with a timeout of 15 minutes
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_TIMEOUT });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_TIMEOUT });

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    logger.log('connection', 'Connexion réussie', { userID: user.id });
    return res.header('auth-token', token).json({
      token,
      refreshToken,
      message: 'Authentification réussie',
      user: {
        id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, partnerCode: user.partnerCode, restaurantId: user.restaurant,
      },
    });
  },
  // GET /api-auth/verify
  verify: async (req, res) => {
    // get X-Forwarded-Uri and compare it with openRoutes
    const forwardedUri = req.headers['x-forwarded-uri'];
    const method = req.headers['x-forwarded-method'];

    logger.log('info', `URL demandée : ${forwardedUri}`);
    logger.log('info', `Verbe HTTP : ${method}`);

    if (forwardedUri && openRoutes.some((route) => forwardedUri.startsWith(route.path) && method === route.method)) {
      logger.log('info', 'Route ouverte');
      return res.status(200).json({
        message: 'Accès autorisé',
      });
    }

    // With url get the socketToken from forwardedUri
    let socketToken;
    if (forwardedUri) {
      const parsedUrl = url.parse(forwardedUri, true).query;
      socketToken = parsedUrl ? parsedUrl.socketToken : null;
    }

    // check if token is provided
    const bearerToken = req.headers.authorization || socketToken;
    const token = bearerToken ? bearerToken.replace('Bearer ', '') : null;

    if (!token) {
      logger.log('connection', 'Token non fourni');
      return res.status(401).json({
        message: 'Accès refusé',
      });
    }

    try {
      // verify the token
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // get the user
      const user = await User.findByPk(verified.id);

      // check if user is blocked
      if (user.isBlocked) {
        logger.log('connection', 'Utilisateur bloqué', { userID: user.id });
        return res.status(401).json({
          message: 'Votre compte a été bloqué',
        });
      }

      // Set the useful information in the header
      const userHeader = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        partnerCode: user.partnerCode,
        ...verified,
      };

      // Add user information to the header
      res.setHeader('X-User', JSON.stringify(userHeader));
      logger.log('connection', 'Utilisateur vérifié', { userID: user.id });

      return res.status(200).json(verified);
    } catch (err) {
      logger.log('connection', 'Token invalide', { error: err });
      return res.status(401).json({
        message: 'Token invalide',
      });
    }
  },
  // POST /api-auth/logout
  refreshToken: async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).send({ error: 'Un refresh token est requis.' });

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findOne({ where: { id: decoded.id, refreshToken } });

      if (!user) return res.status(401).send({ error: 'Le refresh token est invalide.' });
      if (user.isBlocked) return res.status(401).send({ error: 'Votre compte a été bloqué.' });

      const newToken = jwt.sign({ id: user.id.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_TIMEOUT });
      return res.send({ token: newToken, message: 'Token rafraichi' });
    } catch (error) {
      return res.status(401).send({ error: 'Le refresh token est invalide.' });
    }
  },
  // DELETE /api-auth/suspend
  suspend: async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).send({ error: 'Un identifiant utilisateur est requis.' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).send({ error: 'Utilisateur non trouvé.' });

    let message;
    user.isBlocked = !user.isBlocked;
    if (user.isBlocked) {
      message = 'Utilisateur suspendu';
    } else {
      message = 'Utilisateur réactivé';
    }

    await user.save();
    return res.status(200).send({ message });
  },
  // PUT /api-auth/update
  update: async (req, res) => {
    let { userId } = req.body;
    const {
      firstName, lastName, email, currentPassword, newPassword, partnerCode,
    } = req.body;

    if (req.body.userData.role === 'marketing') {
      if (!userId) userId = req.body.userData.id;
    } else {
      userId = req.body.userData.id;
    }

    if (!userId) userId = req.body.userData.id;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).send({ error: 'Utilisateur non trouvé.' });

    // check if email already exists
    if (email) {
      const userEmail = await User.findOne({
        where: { email, id: { [Op.not]: userId } },
      });
      if (userEmail) {
        return res.status(400).json({
          message: 'Email déjà utilisé',
        });
      }
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;

    if (currentPassword && newPassword && user.id === req.body.userData.id) {
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({
          message: 'Mot de passe incorrect',
        });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (partnerCode) {
      // Check if the partner code is not already used
      const partner = await User.findOne({ where: { partnerCode } });

      if (partner && partner.id !== user.id) {
        return res.status(400).json({
          message: 'Code de parrainage déjà utilisé',
        });
      }
      user.partnerCode = partnerCode;
    }

    await user.save();
    return res.status(200).send({ message: 'Utilisateur mis à jour' });
  },
  // GET /api-auth/users
  getUsers: async (req, res) => {
    // Find all users but exclude the password
    const users = await User.findAll({
      attributes: { exclude: ['password', 'refreshToken'] },
    });
    return res.status(200).send(users);
  },
  // GET /api-auth/user
  getUser: async (req, res) => {
    const { id } = req.body.userData;

    try {
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'refreshToken', 'partnerId'] },
        include: [{ model: User, as: 'partner', attributes: ['id', 'firstName', 'lastName'] }],
      });

      if (!user) {
        return res.status(404).send({ error: 'Utilisateur non trouvé.' });
      }

      // Sous-requête pour compter le nombre de personnes parrainées
      const partnerNumber = await User.count({
        where: { partnerId: id },
      });

      // Ajouter le nombre de personnes parrainées dans le retour de la requête
      const userDataWithReferrals = {
        ...user.toJSON(),
        partnerNumber,
      };

      return res.status(200).send(userDataWithReferrals);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return res.status(500).send({ error: 'Erreur lors de la récupération de l\'utilisateur.' });
    }
  },
  // GET /api-auth/user/:id
  getUserById: async (req, res) => {
    const { id } = req.params;

    try {
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'refreshToken', 'partnerId'] },
        include: [{ model: User, as: 'partner', attributes: ['id', 'firstName', 'lastName'] }],
      });

      if (!user) {
        return res.status(404).send({ error: 'Utilisateur non trouvé.' });
      }

      // Sous-requête pour compter le nombre de personnes parrainées
      const partnerNumber = await User.count({
        where: { partnerId: id },
      });

      // Ajouter le nombre de personnes parrainées dans le retour de la requête
      const userDataWithReferrals = {
        ...user.toJSON(),
        partnerNumber,
      };

      return res.status(200).send(userDataWithReferrals);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return res.status(500).send({ error: 'Erreur lors de la récupération de l\'utilisateur.' });
    }
  },
  // DELETE /api-auth/delete
  delete: async (req, res) => {
    const { id } = req.body.userData;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).send({ error: 'Utilisateur non trouvé.' });

    await user.destroy();
    return res.status(200).send({ message: 'Utilisateur supprimé' });
  },
  // DELETE /api-auth/delete/:id
  deleteById: async (req, res) => {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).send({ error: 'Utilisateur non trouvé.' });

    await user.destroy();
    return res.status(200).send({ message: 'Utilisateur supprimé' });
  },

  // GET /api-auth/restaurant
  updateRestaurant: async (req, res) => {
    const { id } = req.body.userData;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).send({ error: 'Utilisateur non trouvé.' });

    logger.log('info', 'Récupération restaurant', { userID: user.id });
    const restaurant = await restaurantClient.getRestaurantByCreatorId(user.id);
    user.restaurant = restaurant ? restaurant._id : null;

    await user.save();
    return res.status(200).send({ message: 'Restaurant mis à jour' });
  },
};

export default authController;
