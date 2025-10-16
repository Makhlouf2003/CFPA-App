module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("utilisateur", {
    nom: {
      type: Sequelize.STRING
    },
    email: {
      type: Sequelize.STRING
    },
    mot_de_passe: {
      type: Sequelize.STRING
    }
  });

  return User;
};