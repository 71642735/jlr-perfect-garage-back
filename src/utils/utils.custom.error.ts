class CustomError extends Error {
	errorCode: number;

	constructor(message: string, errorCode: number) {
		super(message);
		this.name = this.constructor.name;
		this.errorCode = errorCode;
	}
}

export { CustomError };
