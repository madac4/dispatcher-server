export const validateEmail = (email: string) => {
	return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email)
}

export const validatePassword = (password: string) => {
	return (
		/[A-Z]/.test(password) &&
		/[a-z]/.test(password) &&
		/\d/.test(password) &&
		/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password) &&
		password.length >= 8
	)
}
