// api/verify-recaptcha.js

export async function verifyRecaptchaToken({
  token,
  expectedAction,
  minimumScore = 0.5,
}) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    return {
      success: false,
      error: "Missing RECAPTCHA_SECRET_KEY environment variable.",
    };
  }

  if (!token) {
    return {
      success: false,
      error: "Missing reCAPTCHA token.",
    };
  }

  const params = new URLSearchParams();
  params.append("secret", secretKey);
  params.append("response", token);

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const result = await response.json();

  if (!result.success) {
    return {
      success: false,
      error: "reCAPTCHA verification failed.",
      details: result,
    };
  }

  if (expectedAction && result.action !== expectedAction) {
    return {
      success: false,
      error: "reCAPTCHA action mismatch.",
      details: result,
    };
  }

  if (typeof result.score === "number" && result.score < minimumScore) {
    return {
      success: false,
      error: "reCAPTCHA score too low.",
      details: result,
    };
  }

  return {
    success: true,
    details: result,
  };
}