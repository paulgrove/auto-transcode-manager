const PartitionQueue = require("partition-queue");
const Promise = require("bluebird");
const Mediainfo = Promise.promisifyAll(require('./mediainfo-parser.js'));
const find = require("find");
const execa = require("execa");
const util = require("util");
const fs = Promise.promisifyAll(require("fs"));

const metaDataProcess = new PartitionQueue({autostart: true, concurrency: 10});
const transcodeQueue = new PartitionQueue({autostart: true, concurrency: 1});

const transcodeHEVC = (file) => {
        return async () => {
                const exec = execa("HandBrakeCLI", [
                        "-i", file,
                        "-o", file + ".transcodejob",
                        "-f", "av_mkv",
                        "-m", // include chapter bookmarks
                        "-E", "copy", // Copy origional audio
                        //"--audio-lang-list", "und",
                        //"--all-audio",
                        "--audio-copy-mask", "ac3,dts,dtshd", // Only copy origional audio tracks of this type
                        "--audio-fallback", "ffac3", // audio trancode if none of audio-copy-mask exist
                        "--mixdown", "5point1,stereo",
                        "-e", "nvenc_h265", // output video encoding
                        "--no-two-pass",
                        //"-b", "35000", // target bitrate
                        "-q", "18.0", // quality level or ^br
                        "-x", "level=5.1", // ??
                        //"--vfr",
                        "--pfr", // variable rate not exceeding value of -r
                        "-r", "30", // frame rate
                        "--native-language", "eng", // set the default language to english
                        "--native-dub", // set the default audio channel to that of --native-language
                        "-F", // ?
                        "--all-subtitles", // ?
                ]);
                exec.stdout.pipe(process.stdout);
                exec.stderr.pipe(process.stderr);
                await exec;
                await fs.renameAsync(file, file + ".orig");
                await fs.renameAsync(file + ".transcodejob", file);
        };
};

const processMetadata = (file) => {
        return async () => {
                const info = await Mediainfo.exec(file);
                if (!info) return;//error(new Error("no info"));
                if(info.media && !info.file)
                    info.file = info.media;
                try {
                        //let encode = false;
                        for (const track of info.file.track) {
                                if (track._type === "Video") {
                                        if (track.format !== "HEVC") throw new Error("Not HEVC: " + track.format);
                                        if (track.bitdepth < 10) throw new Error("bitdepth < 10: " + track.bitdepth);
                                        if (track.sampledHeight < 2160) throw new Error("sampledHeight < 2160: " + track.sampledHeight);
                                        if (track.bitrate <= 35000000) throw new Error("bitrate <= 35000000: " + track.bitrate);
                                        console.log("Enquing transcode job for", file);
                                        //console.log(track);
                                        console.log(`${track.format} ${track.bitdepth} ${track.sampledHeight} ${track.bitrate}`);
                                        //console.log(util.inspect(info, {showHidden: false, depth: null, colors: true}));
                                        //encode = true;
                                        //process.exit(-1);
                                        transcodeQueue.push("transcode", transcodeHEVC(file));
                                        return;
                                }
                        }
                        //if (encode)
                } catch (err) {
                        //console.log(err.message, ":", file);
                }
        }
}

(async () => {
        await new Promise((resolve, reject) => {
                find.eachfile(/\.mkv$/, "z:\\Videos", (file) => {
                        if (!file) return;
                        metaDataProcess.push("mdp", processMetadata(file));
                })
                .end(() => {
                        resolve();
                })
                .error(reject)
        });
})();
