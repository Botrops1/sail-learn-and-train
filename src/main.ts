import './style.css';
import { startApp } from './app/app';

const host = document.getElementById('app');
if (host) startApp(host);
