// Bundled into www/native.js by `npm run build` — exposes Capacitor plugins and the PDF library to the plain-JS app.
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
window.CBNative = { Capacitor, Share, App, Filesystem, Directory };
window.CBPdf = { jsPDF, autoTable };
