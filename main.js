const voices = require("./info").voices;
const qs = require("querystring");
const brotli = require("brotli");
const https = require("https");
const md5 = require("js-md5");
const http = require("http");

// Fallback option for compatibility between Wrapper and https://github.com/Windows81/Text2Speech-Haxxor-JS.
let get;
try {
	get = require("../misc/get");
} catch {
	get = require("./get");
}

module.exports = (voiceName, text) => {
	return new Promise(async (res, rej) => {
		const voice = voices[voiceName];
		switch (voice.source) {
			case "nextup": {
				https.get("https://nextup.com/ivona/index.html", (r) => {
					var q = qs.encode({
						voice: voice.arg,
						language: `${voice.language}-${voice.country}`,
						text: text,
					});
					var buffers = [];
					https.get(`https://nextup.com/ivona/php/nextup-polly/CreateSpeech/CreateSpeechGet3.php?${q}`, (r) => {
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => {
							const loc = Buffer.concat(buffers).toString();
							if (!loc.startsWith("http")) rej();
							get(loc).then(res).catch(rej);
						});
						r.on("error", rej);
					});
				});
				break;
			}
			case "polly": {
				var buffers = [];
				var req = https.request(
					{
						hostname: "pollyvoices.com",
						port: "443",
						path: "/api/sound/add",
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
					},
					(r) => {
						r.on("data", (b) => buffers.push(b));
						r.on("end", () => {
							var json = JSON.parse(Buffer.concat(buffers));
							if (json.file) get(`https://pollyvoices.com${json.file}`).then(res);
							else rej();
						});
					}
				);
				req.write(qs.encode({ text: text, voice: voice.arg }));
				req.end();
				break;
			}
			case "cepstral":
			case "voiceforge": {
				https.get("https://www.voiceforge.com/demo", (r) => {
					const cookie = r.headers["set-cookie"];
					var q = qs.encode({
						voice: voice.arg,
						voiceText: text,
					});
					var buffers = [];
					https.get(
						{
							host: "www.voiceforge.com",
							path: `/demos/createAudio.php?${q}`,
							headers: { Cookie: cookie },
						},
						(r) => {
							r.on("data", (b) => buffers.push(b));
							r.on("end", () => {
								const html = Buffer.concat(buffers);
								const beg = html.indexOf('id="mp3Source" src="') + 20;
								const end = html.indexOf('"', beg);
								const loc = html.subarray(beg, end).toString();
								get(`https://www.voiceforge.com${loc}`).then(res).catch(rej);
							});
						}
					);
				});
				break;
			}
			case "vocalware": {
				var [eid, lid, vid] = voice.arg;
				var cs = md5(`${eid}${lid}${vid}${text}1mp35883747uetivb9tb8108wfj`);
				var q = qs.encode({
					EID: voice.arg[0],
					LID: voice.arg[1],
					VID: voice.arg[2],
					TXT: text,
					EXT: "mp3",
					IS_UTF8: 1,
					ACC: 5883747,
					cache_flag: 3,
					CS: cs,
				});
				var req = https.get(
					{
						host: "cache-a.oddcast.com",
						path: `/tts/gen.php?${q}`,
						headers: {
							Referer: "https://www.oddcast.com/",
							Origin: "https://www.oddcast.com/",
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36",
						},
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "voicery": {
				var q = qs.encode({
					text: text,
					speaker: voice.arg,
					ssml: text.includes("<"),
					//style: 'default',
				});
				https.get(
					{
						host: "www.voicery.com",
						path: `/api/generate?${q}`,
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "watson": {
				var q = qs.encode({
					text: text,
					voice: voice.arg,
					download: true,
					accept: "audio/mp3",
				});
				https.get(
					{
						host: "text-to-speech-demo.ng.bluemix.net",
						path: `/api/v3/synthesize?${q}`,
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "acapela": {
				var buffers = [];
				var acapelaArray = [];
				for (var c = 0; c < 15; c++) acapelaArray.push(~~(65 + Math.random() * 26));
				var email = `${String.fromCharCode.apply(null, acapelaArray)}@gmail.com`;

				var req = https.request(
					{
						hostname: "acapelavoices.acapela-group.com",
						path: "/index/getnonce",
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
					},
					(r) => {
						r.on("data", (b) => buffers.push(b));
						r.on("end", () => {
							var nonce = JSON.parse(Buffer.concat(buffers)).nonce;
							var req = http.request(
								{
									hostname: "acapela-group.com",
									port: "8080",
									path: "/webservices/1-34-01-Mobility/Synthesizer",
									method: "POST",
									headers: {
										"Content-Type": "application/x-www-form-urlencoded",
									},
								},
								(r) => {
									var buffers = [];
									r.on("data", (d) => buffers.push(d));
									r.on("end", () => {
										const html = Buffer.concat(buffers);
										const beg = html.indexOf("&snd_url=") + 9;
										const end = html.indexOf("&", beg);
										const sub = html.subarray(beg, end).toString();
										http.get(sub, (r) => {
											r.on("data", (d) => buffers.push(d));
											r.on("end", () => {
												res(Buffer.concat(buffers));
											});
										});
									});
									r.on("error", rej);
								}
							);
							req.end(
								qs.encode({
									req_voice: voice.arg,
									cl_pwd: "",
									cl_vers: "1-30",
									req_echo: "ON",
									cl_login: "AcapelaGroup",
									req_comment: `{"nonce":"${nonce}","user":"${email}"}`,
									req_text: text,
									cl_env: "ACAPELA_VOICES",
									prot_vers: 2,
									cl_app: "AcapelaGroup_WebDemo_Android",
								})
							);
						});
					}
				);
				req.end(
					qs.encode({
						json: `{"googleid":"${email}"`,
					})
				);
				break;
			}
			case "acapelaOld": {
				var q = qs.encode({
					inputText: base64.encode(text),
				});
				https.get(
					{
						host: "voice.reverso.net",
						path: `/RestPronunciation.svc/v1/output=json/GetVoiceStream/voiceName=${voice.arg}?${q}`,
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "svox": {
				var q = qs.encode({
					apikey: "e3a4477c01b482ea5acc6ed03b1f419f",
					action: "convert",
					format: "mp3",
					voice: voice.arg,
					speed: 0,
					text: text,
					version: "0.2.99",
				});
				https.get(
					{
						host: "api.ispeech.org",
						path: `/api/rest?${q}`,
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "festival": {
                var req = https.request({
                        hostname: "texttomp3.online",
                        path: "/php/logic/textToSpeech.php",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF8",
							Host: "www.texttomp3.online",
							Origin: "https://www.texttomp3.online",
							Referer: "https://www.texttomp3.online/",
							"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36",
                        },
                    },
                    (r) => {
						var buffers = [];
						r.on("data", (b) => buffers.push(b));
                        r.on("end", () => {
							const mp3 = Buffer.concat(buffers).toString();
							const loc = `https://www.texttomp3.online/audio_tmp/${mp3}`
							get(loc).then(res).catch(rej);
						});
						r.on("error", rej);
					});
                    req.write(qs.encode({
                        msg: text,
                        voice: voice.arg,
						usebackmusic: 0,
						backmusicfile: "",
						backmusicvolume: ""
                    }));
					req.end();
					break;
			}
			case "wavenet": {
                var req = https.request({
                        hostname: "texttospeechapi.wideo.co",
                        path: "/api/wideo-text-to-speech",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
							Origin: "https://texttospeech.wideo.co",
							Referer: "https://texttospeech.wideo.co/",
							"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36",
                        },
                    },
                    (r) => {
						var buffers = [];
						r.on("data", (b) => buffers.push(b));
                        r.on("end", () => {
							const json = Buffer.concat(buffers).toString();
							const beg = json.indexOf('"url":') + 7;
					        const end = json.indexOf('"}}', beg);
					        const sub = json.substring(beg, end);
							console.log(sub);
							get(sub).then(res).catch(rej);
						});
						r.on("error", rej);
					});
					req.write(`{"data":{"text":"${text}","speed":1,"voice":"${voice.arg}"}}`);
					req.end();
					break;
			}
			/*
			case "acapela": {
				var q = qs.encode({
					cl_login: "VAAS_MKT",
					req_snd_type: "",
					req_voice: voice.arg,
					cl_app: "seriousbusiness",
					req_text: text,
					cl_pwd: "M5Awq9xu",
				});
				http.get(
					{
						host: "vaassl3.acapela-group.com",
						path: `/Services/AcapelaTV/Synthesizer?${q}`,
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => {
							const html = Buffer.concat(buffers);
							const beg = html.indexOf("&snd_url=") + 9;
							const end = html.indexOf("&", beg);
							const sub = html.subarray(beg + 4, end).toString();
							if (!sub.startsWith("://")) return rej();
							get(`https${sub}`).then(res).catch(rej);
						});
						r.on("error", rej);
					}
				);
				break;
			}
			*/
			case "readloud": {
				const req = https.request(
					{
						host: "readloud.net",
						path: voice.arg,
						method: "POST",
						port: "443",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => {
							const html = Buffer.concat(buffers);
							const beg = html.indexOf("/tmp/");
							const end = html.indexOf(".mp3", beg) + 4;
							const sub = html.subarray(beg, end).toString();
							const loc = `https://readloud.net${sub}`;
							get(loc).then(res).catch(rej);
						});
						r.on("error", rej);
					}
				);
				req.end(
					qs.encode({
						but1: text,
						but: "Enviar",
					})
				);
				break;
			}
			case "cereproc": {
				const req = https.request(
					{
						hostname: "www.cereproc.com",
						path: "/themes/benchpress/livedemo.php",
						method: "POST",
						headers: {
							"content-type": "text/xml",
							"accept-encoding": "gzip, deflate, br",
							origin: "https://www.cereproc.com",
							referer: "https://www.cereproc.com/en/products/voices",
							"x-requested-with": "XMLHttpRequest",
							cookie: "Drupal.visitor.liveDemo=666",
						},
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => {
							const xml = String.fromCharCode.apply(null, brotli.decompress(Buffer.concat(buffers)));
							const beg = xml.indexOf("https://cerevoice.s3.amazonaws.com/");
							const end = xml.indexOf(".mp3", beg) + 4;
							const loc = xml.substr(beg, end - beg).toString();
							get(loc).then(res).catch(rej);
						});
						r.on("error", rej);
					}
				);
				req.end(
					`<speakExtended key='666'><voice>${voice.arg}</voice><text>${text}</text><audioFormat>mp3</audioFormat></speakExtended>`
				);
				break;
			}
			/*
			case "sestek": {
				https.get(
					{
						hostname: "ttsdemo.sestek.com",
						path: "/Demo.aspx",
					},
					(r) => {
						var cookie = r.headers["set-cookie"];
						https.get(
							{
								hostname: "ttsdemo.sestek.com",
								headers: { Cookie: cookie },
								path: "/Demo.aspx",
							},
							(r) => {
								var buffers = [];
								r.on("data", (d) => buffers.push(d));
								r.on("end", () => {
									html = Buffer.concat(buffers).toString();
									var vs = /__VIEWSTATE" value="([^"]+)/.exec(html);
									var vg = /__VIEWSTATEGENERATOR" value="([^"]+)/.exec(html);
									var ev = /__EVENTVALIDATION" value="([^"]+)/.exec(html);

									if (vs && ev && vg) {
										vs = vs[1];
										vg = vg[1];
										ev = ev[1];
									} else rej();

									var q = qs.encode({
										__EVENTTARGET: "Button1",
										__EVENTARGUMENT: "",
										__VIEWSTATE: vs,
										__EVENTVALIDATION: ev,
										__VIEWSTATEGENERATOR: vg,
										ddlVoices: voice.arg,
										TextBox1: text,
									});

									const req = https.request(
										{
											hostname: "ttsdemo.sestek.com",
											path: "/demo.aspx",
											method: "POST",
											headers: {
												cookie: cookie,
												"Content-Type": "application/x-www-form-urlencoded",
												"Content-Length": q.length,
											},
										},
										(r) => {
											var buffers = [];
											r.on("data", (d) => buffers.push(d));
											r.on("end", () => {
												console.log(r.headers.location);
												get(r.headers.location).then(res).catch(rej);
											});
											r.on("error", rej);
										}
									);
									req.end(q);
								});
								r.on("error", rej);
							}
						);
					}
				);
				break;
			}
			*/
		}
	});
};
