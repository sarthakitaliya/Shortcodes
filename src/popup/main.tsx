import { createRoot } from 'react-dom/client';
import { Popup } from '../components/popup/Popup';
import '../styles/popup.css';

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
