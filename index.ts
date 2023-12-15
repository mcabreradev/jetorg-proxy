import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv'
import bodyParser from 'body-parser';

import * as querystring from 'querystring';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const secret = process.env.JWT_SECRET || 'secret';
const whitelist = process.env.CORS_WHITELIST?.split(' ') || [];
const aeroapi = process.env.AEROAPI || '';
const apikey = process.env.APIKEY || '';

interface ParamsObject {
  [key: string]: string | number | boolean | null | undefined | ParamsObject | ParamsObject[];
}

const options: cors.CorsOptions = {
  origin: function (origin: string | undefined, callback) {
    if (whitelist.indexOf(origin || '') !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};

const getHeaders = async () => {
  return {
    'Content-Type': 'application/json',
    'x-apikey': apikey,
  };
};

const get = async (url: string) => {
  const options = {
    method: 'GET',
    url: aeroapi + url,
    headers: await getHeaders(),
  };

  try {
    const res = await axios.request(options);
    return res.data;
  } catch (error) {
    throw new Error(
      `Can't fetch data from ${aeroapi + url}:  ${error}`,
    );
  }
};

const post = async (url: string, body: ParamsObject) => {
  const options = {
    method: 'POST',
    maxBodyLength: Infinity,
    url: aeroapi + url,
    headers: await getHeaders(),
    data: JSON.stringify(body),
  };

  try {
    const res = await axios.request(options);
    return res.data;
  } catch (error) {
    throw new Error(
      `Can't post data from ${aeroapi + url} ${error}`,
    );
  }
};

app.use(cors(options));

app.use(express.json());

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json())

app.use((req, res, next) => {
  const token = req.headers?.['super-token'] as string;

  if(req.url === "/generate-token" ){
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: 'No token was provided' });
  }

  try {
    jwt.verify(token, secret);
    next();
  } catch (error) {
    console.error(error);
    return res.status(403).json({ error: 'Invalid token' });
  }
});
app.get('/api*', async (req, res) => {
  const { params } = req as { params: ParamsObject };
  const { query } = req ;
  const qs = querystring.stringify(query as querystring.ParsedUrlQueryInput);

  try {
    const response = await get(`${params[0]}${qs ? '?' + qs : ''}`);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en la solicitud GET '+error , });
  }
});

app.post('/api*', async (req, res) => {
  const { params } = req as { params: ParamsObject };
  const { query } = req ;
  const qs = querystring.stringify(query as querystring.ParsedUrlQueryInput);

  try {
    const response = await axios.post(`${params[0]}${qs ? '?' + qs : ''}`, req.body);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en la solicitud POST' });
  }
});

app.get('/generate-token', (req, res) => {
  const token = jwt.sign({}, secret, { expiresIn: '1d' });
  res.json({ token });
});

app.listen(PORT, () => {
  console.log(`Serving http://localhost:${PORT}`);
});