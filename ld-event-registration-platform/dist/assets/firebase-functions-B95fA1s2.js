import{F as R,g as w,_ as L,a as U,b as F,i as S,p as x,c as $,C as M,r as N,d as G}from"./firebase-BxQ1m8GX.js";import"./vendor-C5LNpiCU.js";import"./react-vendor-YATcyuH6.js";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const H="type.googleapis.com/google.protobuf.Int64Value",J="type.googleapis.com/google.protobuf.UInt64Value";function v(e,t){const r={};for(const n in e)e.hasOwnProperty(n)&&(r[n]=t(e[n]));return r}function A(e){if(e==null)return null;if(e instanceof Number&&(e=e.valueOf()),typeof e=="number"&&isFinite(e)||e===!0||e===!1||Object.prototype.toString.call(e)==="[object String]")return e;if(e instanceof Date)return e.toISOString();if(Array.isArray(e))return e.map(t=>A(t));if(typeof e=="function"||typeof e=="object")return v(e,t=>A(t));throw new Error("Data cannot be encoded in JSON: "+e)}function g(e){if(e==null)return e;if(e["@type"])switch(e["@type"]){case H:case J:{const t=Number(e.value);if(isNaN(t))throw new Error("Data cannot be decoded from JSON: "+e);return t}default:throw new Error("Data cannot be decoded from JSON: "+e)}return Array.isArray(e)?e.map(t=>g(t)):typeof e=="function"||typeof e=="object"?v(e,t=>g(t)):e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const k="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const b={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class d extends R{constructor(t,r,n){super(`${k}/${t}`,r||""),this.details=n,Object.setPrototypeOf(this,d.prototype)}}function j(e){if(e>=200&&e<300)return"ok";switch(e){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function y(e,t){let r=j(e),n=r,s;try{const i=t&&t.error;if(i){const a=i.status;if(typeof a=="string"){if(!b[a])return new d("internal","internal");r=b[a],n=a}const o=i.message;typeof o=="string"&&(n=o),s=i.details,s!==void 0&&(s=g(s))}}catch(i){}return r==="ok"?null:new d(r,n,s)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q{constructor(t,r,n,s){this.app=t,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,G(t)&&t.settings.appCheckToken&&(this.serverAppAppCheckToken=t.settings.appCheckToken),this.auth=r.getImmediate({optional:!0}),this.messaging=n.getImmediate({optional:!0}),this.auth||r.get().then(i=>this.auth=i,()=>{}),this.messaging||n.get().then(i=>this.messaging=i,()=>{}),this.appCheck||s==null||s.get().then(i=>this.appCheck=i,()=>{})}async getAuthToken(){if(this.auth)try{const t=await this.auth.getToken();return t==null?void 0:t.accessToken}catch(t){return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch(t){return}}async getAppCheckToken(t){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const r=t?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return r.error?null:r.token}return null}async getContext(t){const r=await this.getAuthToken(),n=await this.getMessagingToken(),s=await this.getAppCheckToken(t);return{authToken:r,messagingToken:n,appCheckToken:s}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const E="us-central1",V=/^data: (.*?)(?:\n|$)/;function B(e){let t=null;return{promise:new Promise((r,n)=>{t=setTimeout(()=>{n(new d("deadline-exceeded","deadline-exceeded"))},e)}),cancel:()=>{t&&clearTimeout(t)}}}class X{constructor(t,r,n,s,i=E,a=(...o)=>fetch(...o)){this.app=t,this.fetchImpl=a,this.emulatorOrigin=null,this.contextProvider=new q(t,r,n,s),this.cancelAllRequests=new Promise(o=>{this.deleteService=()=>Promise.resolve(o())});try{const o=new URL(i);this.customDomain=o.origin+(o.pathname==="/"?"":o.pathname),this.region=E}catch(o){this.customDomain=null,this.region=i}}_delete(){return this.deleteService()}_url(t){const r=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${r}/${this.region}/${t}`:this.customDomain!==null?`${this.customDomain}/${t}`:`https://${this.region}-${r}.cloudfunctions.net/${t}`}}function Y(e,t,r){const n=S(t);e.emulatorOrigin=`http${n?"s":""}://${t}:${r}`,n&&x(e.emulatorOrigin+"/backends")}function K(e,t,r){const n=s=>Q(e,t,s,r||{});return n.stream=(s,i)=>Z(e,t,s,i),n}function W(e,t,r){const n=s=>I(e,t,s,r||{});return n.stream=(s,i)=>_(e,t,s,i||{}),n}function D(e){return e.emulatorOrigin&&S(e.emulatorOrigin)?"include":void 0}async function z(e,t,r,n,s){r["Content-Type"]="application/json";let i;try{i=await n(e,{method:"POST",body:JSON.stringify(t),headers:r,credentials:D(s)})}catch(o){return{status:0,json:null}}let a=null;try{a=await i.json()}catch(o){}return{status:i.status,json:a}}async function P(e,t){const r={},n=await e.contextProvider.getContext(t.limitedUseAppCheckTokens);return n.authToken&&(r.Authorization="Bearer "+n.authToken),n.messagingToken&&(r["Firebase-Instance-ID-Token"]=n.messagingToken),n.appCheckToken!==null&&(r["X-Firebase-AppCheck"]=n.appCheckToken),r}function Q(e,t,r,n){const s=e._url(t);return I(e,s,r,n)}async function I(e,t,r,n){r=A(r);const s={data:r},i=await P(e,n),a=n.timeout||7e4,o=B(a),u=await Promise.race([z(t,s,i,e.fetchImpl,e),o.promise,e.cancelAllRequests]);if(o.cancel(),!u)throw new d("cancelled","Firebase Functions instance was deleted.");const l=y(u.status,u.json);if(l)throw l;if(!u.json)throw new d("internal","Response is not valid JSON object.");let c=u.json.data;if(typeof c=="undefined"&&(c=u.json.result),typeof c=="undefined")throw new d("internal","Response is missing data field.");return{data:g(c)}}function Z(e,t,r,n){const s=e._url(t);return _(e,s,r,n||{})}async function _(e,t,r,n){var m;r=A(r);const s={data:r},i=await P(e,n);i["Content-Type"]="application/json",i.Accept="text/event-stream";let a;try{a=await e.fetchImpl(t,{method:"POST",body:JSON.stringify(s),headers:i,signal:n==null?void 0:n.signal,credentials:D(e)})}catch(f){if(f instanceof Error&&f.name==="AbortError"){const T=new d("cancelled","Request was cancelled.");return{data:Promise.reject(T),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(T)}}}}}}const p=y(0,null);return{data:Promise.reject(p),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(p)}}}}}}let o,u;const l=new Promise((f,p)=>{o=f,u=p});(m=n==null?void 0:n.signal)==null||m.addEventListener("abort",()=>{const f=new d("cancelled","Request was cancelled.");u(f)});const c=a.body.getReader(),h=ee(c,o,u,n==null?void 0:n.signal);return{stream:{[Symbol.asyncIterator](){const f=h.getReader();return{async next(){const{value:p,done:T}=await f.read();return{value:p,done:T}},async return(){return await f.cancel(),{done:!0,value:void 0}}}}},data:l}}function ee(e,t,r,n){const s=(a,o)=>{const u=a.match(V);if(!u)return;const l=u[1];try{const c=JSON.parse(l);if("result"in c){t(g(c.result));return}if("message"in c){o.enqueue(g(c.message));return}if("error"in c){const h=y(0,c);o.error(h),r(h);return}}catch(c){if(c instanceof d){o.error(c),r(c);return}}},i=new TextDecoder;return new ReadableStream({start(a){let o="";return u();async function u(){if(n!=null&&n.aborted){const l=new d("cancelled","Request was cancelled");return a.error(l),r(l),Promise.resolve()}try{const{value:l,done:c}=await e.read();if(c){o.trim()&&s(o.trim(),a),a.close();return}if(n!=null&&n.aborted){const m=new d("cancelled","Request was cancelled");a.error(m),r(m),await e.cancel();return}o+=i.decode(l,{stream:!0});const h=o.split(`
`);o=h.pop()||"";for(const m of h)m.trim()&&s(m.trim(),a);return u()}catch(l){const c=l instanceof d?l:y(0,null);a.error(c),r(c)}}},cancel(){return e.cancel()}})}const C="@firebase/functions",O="0.13.6";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const te="auth-internal",re="app-check-internal",ne="messaging-internal";function se(e){const t=(r,{instanceIdentifier:n})=>{const s=r.getProvider("app").getImmediate(),i=r.getProvider(te),a=r.getProvider(ne),o=r.getProvider(re);return new X(s,i,a,o,n)};$(new M(k,t,"PUBLIC").setMultipleInstances(!0)),N(C,O,e),N(C,O,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ue(e=F(),t=E){const n=L(w(e),k).getImmediate({identifier:t}),s=U("functions");return s&&ie(n,...s),n}function ie(e,t,r){Y(w(e),t,r)}function le(e,t,r){return K(w(e),t,r)}function de(e,t,r){return W(w(e),t,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */se();export{d as FunctionsError,ie as connectFunctionsEmulator,ue as getFunctions,le as httpsCallable,de as httpsCallableFromURL};
