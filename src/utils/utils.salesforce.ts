import axios from 'axios';
import dotenv from 'dotenv';
import { logError, logInfo } from './utils.logger';

dotenv.config();

interface EventParams {
  action: string;
  userId: string;
  country: string;
  language: string;
  name: string;
  lastName: string;
  email: string;
  timestamp: string;
  cta: string;
  eventDefinitionKey: string;
  tcUrl: string;
  faqUrl: string;
}

interface EventParams2FA {
  userId: string;
  country: string;
  language: string;
  name: string;
  lastName: string;
  email: string;
  timestamp: string;
  authenticationCode: string;
  eventDefinitionKey: string;
}

export interface SFMCCredentials {
  clientId: string;
  clientSecret: string;
  eventThankYou: string;
  eventSuccess: string;
  eventResetPwd: string;
  eventFailed: string;
}

export const authenticate = async (clientId, clientSecret, authUrl): Promise<string> => {
  const authData = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    account_id: '7234930',
  };

  try {
    const response = await axios.post(authUrl, authData);
    const accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    let errorMessage = 'Authentication error';

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data;
      } else if (error.message) {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    logError.error(errorMessage);
    throw error;
  }
};

export const sendDataToDataExtension = async (accessToken, dataExtensionUrl, dataToSend): Promise<string> => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(dataExtensionUrl, dataToSend, { headers });
    logInfo.info(
      'response de salesforce status: ' + JSON.stringify(response.status) + ' data: ' + JSON.stringify(response.data)
    );
    return response.data;
  } catch (error) {
    logError.error(error);

    let errorMessage = 'Error sending data to Data Extension';

    if (axios.isAxiosError(error)) {
      logError.error(error.response?.data);
      if (error.response) {
        errorMessage = errorMessage + error.response.data;
      } else if (error.message) {
        errorMessage = errorMessage + error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = errorMessage + error.message;
    }

    logError.error(errorMessage + error);

    throw error;
  }
};

export const createEventData = async <T>(params: EventParams): Promise<T> => {
  const {
    action,
    userId,
    country,
    language,
    name,
    lastName,
    email,
    timestamp,
    cta,
    eventDefinitionKey,
    tcUrl,
    faqUrl,
  } = params;

  const event: T = {
    contactKey: userId,
    eventDefinitionKey: eventDefinitionKey,
    data: {
      contactKey: userId,
      User_ID: userId,
      Country: country,
      CTA: cta,
      Email: email,
      Language: language,
      Last_name: lastName,
      Name: name,
      TimeStamp_: timestamp,
      TermsConditions: tcUrl,
      PrivacyPolicy: faqUrl,
    },
  } as T;

  logInfo.info('Create event ' + action + ' for salesforce');
  logInfo.info(JSON.stringify(event, null, 2));

  return event;
};

export const createEvent2FA = async <T>(params: EventParams2FA): Promise<T> => {
  const { userId, country, language, name, lastName, email, timestamp, authenticationCode, eventDefinitionKey } =
    params;

  const event: T = {
    contactKey: userId,
    eventDefinitionKey: eventDefinitionKey,
    data: {
      contactKey: userId,
      User_ID: userId,
      Country: country,
      Authentication_Code: authenticationCode,
      Email: email,
      Language: language,
      Last_name: lastName,
      Name: name,
      TimeStamp_: timestamp,
    },
  } as T;

  logInfo.info('Create event for send 2FA email info to  salesforce');
  logInfo.info(JSON.stringify(event, null, 2));

  return event;
};
