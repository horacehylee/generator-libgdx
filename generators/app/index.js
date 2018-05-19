"use strict";
const chalk = require("chalk");
const JavaGenerator = require("yo-java-helper");

/**
 * Generator variables, available for templates:
 */
const questions = [
  "githubUser", // github user name
  "authorName", // author full name
  "authorEmail", // author email
  "projectGroup", // project group
  "projectName", // project name
  "projectDesc", // project description
  "projectPackage" // package name
];

/* extra variables:
*  - year                   // 2015
*  - date                   // 02.12.2015
*  - reverseDate            // 2015-12-02
*/

/*
Templates syntax:
- <%= %> html escaped value
- <%- %> not escaped (raw) value
- <% %> any logic (script block)
*/

const globals = ["githubUser", "authorName", "authorEmail", "projectGroup"];

module.exports = class extends JavaGenerator {
  constructor(args, opts) {
    super(args, opts, require("../../package.json"));

    this.option("offline", {
      desc: "Disables github user lookup",
      type: Boolean,
      defaults: false
    });
  }

  initializing() {
    // init
    this.$initConfig(questions);
    this.$initDateVars();

    // read gradle config
    const done = this.async();
    this.context.gradleConfPath = this.$resolveFileFromUserHome(
      ".gradle/gradle.properties"
    );
    this.$readProperties(this.context.gradleConfPath, res => {
      this.context.gradleConf = res;
      done();
    });
  }

  prompting() {
    // greeting
    this.log(chalk.yellow(this.$readBanner("banner.txt")));
    this.log(
      `                                      v.${chalk.green(
        this.context.pkg.version
      )}`
    );
    this.log();

    if (this.context.updateMode) {
      this.log(
        `Updating library ${chalk.red(
          this.appname
        )}, generated with v.${chalk.green(this.context.usedGeneratorVersion)}`
      );
      if (this.context.allAnswered && !this.options.ask) {
        this.log();
        this.log(
          "Using stored answers from .yo-rc.json. \n" +
            "If you need to re-run questions use --ask generator option."
        );
      }
      this.log();
    }

    // ask for github
    const options = this.options;
    if (!options.ask && this.context.allAnswered) {
      return;
    }

    let githubData = {},
      gen = this,
      prompts = [
        {
          type: "input",
          name: "githubUser",
          message: "GitHub username",
          default: this.$defaultValue("githubUser"),
          validate: function(input) {
            if (input === gen.$defaultValue("githubUser")) {
              return true;
            }
            return new Promise(resolve => {
              if (options.offline) {
                if (input) {
                  resolve(true);
                } else {
                  resolve("Github username required");
                }
                return;
              }
              gen.$getGithubData(input, (err, res) => {
                if (err) {
                  resolve(err);
                } else {
                  githubData = res;
                  resolve(true);
                }
              });
            });
          }
        },
        {
          type: "input",
          name: "authorName",
          message: "Author name",
          default: () => githubData.name || this.$defaultValue("authorName"),
          validate: input => (!input ? "Author name required" : true)
        },
        {
          type: "input",
          name: "authorEmail",
          message: "Author email",
          default: () => githubData.email || this.$defaultValue("authorEmail"),
          validate: input => (!input ? "Author email required" : true)
        }
      ];

    let other = () => {
      if (this.context.allAnswered && !this.options.ask) {
        return null;
      }

      const disableOnUpdate = () => !this.context.updateMode;

      prompts = [
        {
          type: "input",
          name: "projectGroup",
          message: "Project group",
          validate: this.$validatePackage,
          default: this.$defaultValue("projectGroup", "com.mycompany")
        },
        {
          type: "input",
          name: "projectPackage",
          message: "Base package",
          validate: this.$validatePackage,
          when: disableOnUpdate,
          default: props =>
            this.projectPackage ||
            `${props.projectGroup}.${this.projectName.replace(
              /(\s+|-|_)/g,
              ""
            )}`
        },
        {
          type: "input",
          name: "projectDesc",
          message: "Description",
          default: this.projectDesc
        }
      ];

      return this.$prompt(prompts, questions);
    };

    let askLibName = () => {
      if (this.context.updateMode) {
        // update must be started from project folder - no need to ask for name
        return null;
      }

      this.log(
        `Accept default project name ${chalk.red(
          this.appname
        )} to generate in current folder, otherwise new folder will be created`
      );

      prompts = [
        {
          name: "projectName",
          message: "Project name",
          default: this.projectName || this.appname,
          filter: this.$folderName
        }
      ];

      return this.$prompt(prompts, ["projectName"]).then(props => {
        this.appname = props.projectName;
        return other();
      });
    };

    return this.$prompt(prompts, questions).then(askLibName);
  }

  configuring() {
    // configure
    this.$selectTargetFolder();
    this.$saveConfiguration(questions, globals);
  }

  writing() {
    this.projectPackageWithSlash = this.projectPackage.replace(/\./g, '/');

    // base
    const writeOnceFiles = [
      "README.md",
      "gradle.properties",
      "LICENSE",
      "settings.gradle"
    ];
    this.gradlewExists = this.$exists("gradlew");
    this.$copy("gradle-base", { writeOnceFiles: writeOnceFiles });
    this.$copyTpl("project-base", { writeOnceFiles: writeOnceFiles });

    // sources
    if (!this.$exists("core")) {
      this.$copySources(this.projectPackage, "sources");
      this.$copy("sources-img", { writeOnceFiles: writeOnceFiles });
    } else {
      this.log(chalk.yellow("     skip ") + "sources generation");
    }
  }

  end() {
    // chmod
    // setting executable flag manually
    if (!this.gradlewExists) {
      this.$setExecutableFlag("gradlew");
    }
  }
};
