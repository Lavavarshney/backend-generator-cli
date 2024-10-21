#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { exec } from "child_process";
import {dependencies } from './snippet-dependencies.js';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import ora from 'ora'; // Import the ora package
import inquirer from 'inquirer'; // Import the inquirer package
import { generateGitignore } from './gitignoreGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNIPPET_PATH = path.join(__dirname, 'snippets'); // Folder containing predefined snippets
const DESTINATION_PATH = process.cwd(); // User's working directory


async function getApiKey() {
  const CONFIG_PATH = path.join(__dirname, 'config.json'); // Define path to save the API key

  let apiKey = '';

  // Check if the API key is already saved in the config file
  if (fs.existsSync(CONFIG_PATH)) {
    const config = fs.readFileSync(CONFIG_PATH, 'utf-8');
    apiKey = JSON.parse(config).apiKey;
  }

  // If no API key is found, prompt the user for it
  if (!apiKey) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your Gemini API key:',
        validate: (input) => (input ? true : 'API key is required!'),
      },
    ]);

    apiKey = answers.apiKey;

    // Save the API key in the config file for future use
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }));
  }

  return apiKey;
}



program
  .version('1.0.0')
  .description('CLI tool to generate a backend project template and use code snippets');

// Command to create backend project structure
program
  .command('create-project')
  .description('Generate the backend project structure')
  .action(() => {
    const TEMPLATE_PATH = path.join(__dirname, 'templates');

    generateGitignore(TEMPLATE_PATH);

    try {
      // Copy the template files to the destination path
      fs.copySync(TEMPLATE_PATH, DESTINATION_PATH);
      console.log(
        chalk.green('\nProject structure created successfully!') +
        chalk.blue('\n\nFollow the steps to get started:') +
        chalk.yellow('\n1. cd <your_project_directory>') +
        chalk.yellow('\n2. npm install') +
        chalk.yellow('\n3. npm run start') +
        chalk.cyan('\n\nHappy coding!\n')
      );
    } catch (err) {
      console.error(chalk.red('Error while generating project structure:'), err);
    }
  });

// Command to generate a snippet in a new file
program
  .command('generate-snippet <snippetName>')
  .description('Generate a code snippet in a new file')
  .action((snippetName) => {
    try {
      // Check if the snippet exists in the snippets folder
      const snippetFile = path.join(SNIPPET_PATH, `${snippetName}.js`);

      if (!fs.existsSync(snippetFile)) {
        console.error(chalk.red(`Error: Snippet "${snippetName}" does not exist.`));
        return;
      }

      // Define the path where the new snippet file will be created in the working directory
      const newSnippetFilePath = path.join(DESTINATION_PATH, `${snippetName}.js`);

      // Copy the snippet file content to the new file in the working directory
      fs.copySync(snippetFile, newSnippetFilePath);
      console.log(
        chalk.yellow("Installing the required packages for the snippet...")
      );
      //Automating installation of various dependencies used in project
      exec(
        `npm install ${dependencies[snippetName].join(" ")}`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(chalk.red("An Error Occured : ",error));
            return;
          }
          if(stderr){
            console.log(chalk.yellow(`Warning: ${stderr}`));
          }
          console.log(stdout);
          console.log(
            chalk.green(
              `\nSnippet "${snippetName}" has been successfully created in your current directory!\n`
            )
          );
        }
      );
    } 
    catch(err){
console.log(chalk.red("Error",err))
    }
  })
 


// Command to generate code using Google's Generative AI
program
  .command('generate-ai-snippet <snippetName>')
  .description('Generate a code snippet using Google\'s Generative AI')
  .action(async (snippetName) => {
    let spinner;
    try {
      // Prompt the user for an API key
      const apiKey = await getApiKey();

      spinner = ora({
        text: `Generating code snippet for ${snippetName}...`,
        color: 'cyan',
      }).start(); // Start the spinner

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Prompt the model to generate a code snippet
      const prompt = `You are an expert MERN stack developer specializing in Backend Development using Node.js and Express.js. Generate a javascript code snippet in module js syntax for ${snippetName}. Return only the code snippet strictly adhering to the requirements without unnecessary wrapper text.`;

      const result = await model.generateContent(prompt);

      // Stop the spinner when the result is generated
      spinner.succeed('Code snippet generated successfully!');

      const generatedCode = result.response.text();  // Extract the generated code

      // Save the generated code to a file
      const newSnippetFilePath = path.join(DESTINATION_PATH, `${snippetName}.js`);
      fs.writeFileSync(newSnippetFilePath, generatedCode);
      console.log(chalk.green(`\nGenerated code snippet saved as ${snippetName}.js in your current directory.\n`));

      // Handle dependency installation if available
      if (dependencies[snippetName]) {
        console.log(chalk.yellow("Installing the required packages for the snippet..."));

        exec(
          `npm install ${dependencies[snippetName].join(" ")}`,
          (error, stdout, stderr) => {
            if (error) {
              console.log(chalk.red("An Error Occured:", error));
              return;
            }
            if (stderr) {
              console.log(chalk.yellow(`Warning: ${stderr}`));
            }
            console.log(stdout);
            console.log(chalk.green(`\nSnippet "${snippetName}" has been successfully created and dependencies installed!\n`));
          }
        );
      } else {
        console.log(chalk.blue(`No predefined dependencies found for ${snippetName}. You may need to install them manually.`));
      }
    } catch (error) {
      // Stop the spinner with an error
      if (spinner) spinner.fail('Error generating content');
      console.error(chalk.red('Error generating content:'), error.message || error);
    }
  });


program.parse(process.argv);