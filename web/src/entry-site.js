// The site's shared code, served as /data.js to the builder, home and share pages and run
// once in the Worker. It publishes the same globals the page scripts have always used, and
// registers its modules for the page scripts that load after it.
import { deskApi } from './desk.js';
import { SV, SVImage } from './api.js';

window.SVDesk = deskApi;
window.SV = SV;
window.SVImage = SVImage;
