function generatePassword(length = 8) {
    return Math.random().toString(36).slice(-length);
}

module.exports = generatePassword;
