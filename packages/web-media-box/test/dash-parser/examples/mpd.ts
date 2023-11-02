export const testMPD = `<MPD mediaPresentationDuration="PT634.566S" minBufferTime="PT2.00S" profiles="urn:hbbtv:dash:profile:isoff-live:2012,urn:mpeg:dash:profile:isoff-live:2011" type="static" xmlns="urn:mpeg:dash:schema:mpd:2011" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd">
<BaseURL>https://www.example.com/</BaseURL>
<BaseURL>https://www.example234.com/</BaseURL>
<Period>
 <BaseURL>additionalPath1/</BaseURL>
 <AdaptationSet mimeType="video/mp4" contentType="video" subsegmentAlignment="true" subsegmentStartsWithSAP="1" par="16:9">
  <BaseURL>additionalPath2/</BaseURL> 
  <SegmentTemplate duration="120" timescale="30" media="$RepresentationID$/$RepresentationID$_$Number$.m4v" startNumber="1" initialization="$RepresentationID$/$RepresentationID$_0.m4v"/>
  <Representation id="bbb_30fps_1024x576_2500k" codecs="avc1.64001f" bandwidth="3134488" width="1024" height="576" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_1280x720_4000k" codecs="avc1.64001f" bandwidth="4952892" width="1280" height="720" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_1920x1080_8000k" codecs="avc1.640028" bandwidth="9914554" width="1920" height="1080" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_320x180_200k" codecs="avc1.64000d" bandwidth="254320" width="320" height="180" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_320x180_400k" codecs="avc1.64000d" bandwidth="507246" width="320" height="180" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_480x270_600k" codecs="avc1.640015" bandwidth="759798" width="480" height="270" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_640x360_1000k" codecs="avc1.64001e" bandwidth="1254758" width="640" height="360" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_640x360_800k" codecs="avc1.64001e" bandwidth="1013310" width="640" height="360" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_768x432_1500k" codecs="avc1.64001e" bandwidth="1883700" width="768" height="432" frameRate="30" sar="1:1" scanType="progressive"/>
  <Representation id="bbb_30fps_3840x2160_12000k" codecs="avc1.640033" bandwidth="14931538" width="3840" height="2160" frameRate="30" sar="1:1" scanType="progressive"/>
 </AdaptationSet>
 <AdaptationSet mimeType="audio/mp4" contentType="audio" subsegmentAlignment="true" subsegmentStartsWithSAP="1">
  <Accessibility schemeIdUri="urn:tva:metadata:cs:AudioPurposeCS:2007" value="6"/>
  <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
  <SegmentTemplate duration="192512" timescale="48000" media="$RepresentationID$/$RepresentationID$_$Number$.m4a" startNumber="1" initialization="$RepresentationID$/$RepresentationID$_0.m4a"/>
  <Representation id="bbb_a64k" codecs="mp4a.40.5" bandwidth="67071" audioSamplingRate="48000">
   <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
  </Representation>
 </AdaptationSet>
</Period>
</MPD>`;
