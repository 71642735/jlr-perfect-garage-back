import Joi from 'joi';
import { IUser } from '../interfaces/auth.iuser';

export const SchemasAuth = {
	postLoginData: Joi.object<IUser>({
		email: Joi.string().email().trim().required(),
		password: Joi.string()
			.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/)
			.required(),
	}),
	patchPassword: Joi.object<IUser>({
		password: Joi.string()
			.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/)
			.required(),
	}),
  	codePathParam: Joi.string().required(),
  	emailPathParam: Joi.string().email().required(),
};
