<h1 align="center" id="title">Pyramid Display</h1>

<p align="center"><img src="https://socialify.git.ci/kgabriel-dev/PyramidDisplay/image?description=1&amp;font=Raleway&amp;forks=1&amp;issues=1&amp;name=1&amp;owner=1&amp;pattern=Solid&amp;pulls=1&amp;stargazers=1&amp;theme=Auto" alt="project-image"></p>

<p id="description">Pyramid Display is an open-source application that allows you to create the illusion of a hologram on any device using the Pepper's Ghost Effect. With Pyramid Display you can upload your own images and the app will create a structure on your screen that reflects the image to create the illusion of a hologram floating in the air. The app runs in the browser and is compatible with any device that has a screen and you can customize the size and shape of the structure to fit your needs.</p>

<p align="center"><img src="https://img.shields.io/github/downloads/kgabriel-dev/PyramidDisplay/total" alt="shields"> <img src="https://img.shields.io/github/v/release/kgabriel-dev/PyramidDisplay?include_prereleases" alt="shields"> <img src="https://img.shields.io/github/issues/kgabriel-dev/PyramidDisplay" alt="shields"></p>

<strong>This projects creates images on your display that need to be reflected, preferrably on a translucent material. How you can build this mirror is described in the section: 🧰 Building the mirror</strong>

<h2>Project Screenshots:</h2>

<img src="https://i.ibb.co/Gp1Mt0S/localhost-4200-i-Pad-Air-1.png" alt="project-screenshot" width="410" height="590/">

  
  
<h2>🧐 Features</h2>

Here're some of the project's best features:

*   Easy to use: Pyramid Display is user-friendly. You can upload your images and the app takes care of the rest.
*   Responsive Design: The app is designed to be responsive and compatible with any device that has a screen. That means you can create holograms on your smartphone tablet or desktop computer.
*   Open-Source: Pyramid Display is an open-source project meaning that anyone can contribute to the development of the app. This also means that the app is free to use.
*   Cross-Browser-Compatibility: You can use the app in every browser.


<h2>🛠️ How to use the software</h2>
You can find a working version of this project on my website <a href="https://hologram.kgabriel.dev/en-US/">https://hologram.kgabriel.dev/en-US/</a>
<br /><br />
You can also download this source code and build the software yourself. Follow these steps to do so:
<ol>
<li>Download the source code / clone the repository.</li>
<li>Download and install NodeJS to use its package manager NPM. You can find the latest version on <a href="https://nodejs.org/en/download">nodejs.org/en/download</a></li>
<li>Navigate into the root folder of this project and open a terminal there.</li>
<li>Run the command "npm install" to install all required packages.</li>
<li>In the angular.json file in the root folder, change the option "localize" under "projects -> PyramidDisplay -> architect -> build -> options" to your desired language. Currently available are English (enter this: ["en-US"]) and German (enter this: ["de-DE"]).</li>
<li>In your terminal, run the command "ng serve". After the command finishes, the project is available as a website under <a href="http://localhost:4200">localhost:4200</a>.</li>
</ol>
  

<h2>🧰 Building the mirror</h2>
To make use of this project, you need a mirror that reflects the images created by the app. You can build this mirror yourself. Here's how you can build a mirror for the standard display method (called "Standard Method" in the app):
<ol>
<li>Get a transparent material. This can be a transparent plastic sheet or a glass pane. The material should be as transparent as possible, but also reflect some of the light.</li>
<li>Configure the settings so they match your needs. Important are the settings "Size of the polygon in the middle" and "Number of sides / images".</li>
<li>Click on the calculator icon in the bottom right of the screen. This will open a popup where you have to enter some more settings.</li>
<li>Click on the green button with the text "Generate image". This will download an image showing you the form the tiles of your mirror need to have.</li>
<li>Cut this form out of the material you chose for your mirror. You need as many tiles as you have set the number of sides/images.</li>
<li>Lay the tiles edge to edge, so they start forming a circle. The connect the edges using some tape. Then connect the outer two edges, so your mirror forms.</li>
</ol>

Here is an image of a mirror with 4 sides:<br />
<img src="https://upload.wikimedia.org/wikipedia/commons/e/e2/Pyramid_holographic_3D_holographic_projection_phone_projector_3D_holographic_projection_3D_mobile_phone_naked_eye_3D_pyramid.jpg" alt="image of a mirror" width="300px"><br />&copy; Image licensed by Karthick98 under the <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.en">Creative Commons Attribution-Share Alike 4.0 International license</a>, uploaded on wikipedia.org.

  
<h2>💻 Built with</h2>

Technologies used in the project:

*   Angular 15
*   TailwindCSS

<h2>🛡️ License:</h2>

This project is licensed under the MIT License, you can find the full license text in the file <a href="https://github.com/kgabriel-dev/PyramidDisplay/blob/master/LICENSE">LICENSE</a>.
