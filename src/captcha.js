export function createCaptcha(req) {
  const left = randomInt(2, 9);
  const right = randomInt(2, 9);

  req.session.captcha = {
    answer: String(left + right),
    createdAt: Date.now()
  };

  return {
    question: `${left} + ${right} = ?`
  };
}

export function verifyCaptcha(req, answer) {
  const expected = req.session.captcha?.answer;
  delete req.session.captcha;

  return Boolean(expected && String(answer).trim() === expected);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
