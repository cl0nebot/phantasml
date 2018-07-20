module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

  // load our build configuration
  const config = grunt.file.readJSON('etc/build-config.json');
  const exerciseNames = [];

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    babel: {
      dist: {
        options: {
          presets: ['env', 'react'],
          plugins: [
            'transform-class-properties',
            'transform-runtime',
            ['flow-runtime', {optInOnly: true}],
          ],
        },
        files: [
          {
            expand: true,
            cwd: 'src',
            src: '**/*.js',
            dest: 'build/',
          },
        ],
      },
    },
    env: (function() {
      const taskConfig = {};
      for (const key in config.distributions) {
        taskConfig[key] = {
          NODE_ENV: config.distributions[key].nodeEnv || 'development',
        };
      }
      return taskConfig;
    })(),
    browserify: (function() {
      const taskConfig = {
        exercises: {
          options: {
            transform: ['browserify-shim'],
          },
          files: [
            {
              expand: true,
              src: 'build/client/exercises/+([0-9])-+([a-z-]).js',
              ext: '.bundle.js',
            },
          ],
        },
      };
      for (const key in config.distributions) {
        taskConfig[key] = {
          options: {
            browserifyOptions: {debug: config.distributions[key].beautify},
          },
          src: 'build/client/app.js',
          dest: 'build/client/app.bundle.js',
        };
      }
      return taskConfig;
    })(),
    copy: {
      app: {
        files: [
          {
            expand: true,
            cwd: 'src/server',
            src: ['package.json', 'package-lock.json'],
            dest: 'build/server/',
          },
        ],
      },
    },
    uglify: (function() {
      const taskConfig = {
        exercises: {
          files: [
            {
              expand: true,
              cwd: 'build/client',
              src: 'exercises/+([0-9])-*.bundle.js',
              dest: 'dist/',
              ext: '.min.js',
            },
          ],
        },
      };
      for (const key in config.distributions) {
        taskConfig[key] = {
          options: {beautify: config.distributions[key].beautify},
          src: 'build/client/app.bundle.js',
          dest: `dist/${key}/app.min.js`,
        };
      }
      return taskConfig;
    })(),
    replace: (function() {
      const taskConfig = {};
      const filenames = grunt.file.expand({cwd: 'src/client/exercises'}, [
        '+([0-9])-*.js',
      ]);
      const path = require('path');
      for (const name of filenames) {
        const basename = path.basename(name, '.js');
        exerciseNames.push(basename);
        taskConfig[basename] = {
          options: {
            patterns: [{match: 'path', replacement: `${basename}.min.js`}],
          },
          src: 'src/client/exercises/template.html',
          dest: `dist/exercises/${basename}.html`,
        };
      }
      for (const key in config.distributions) {
        const distributionConfig = config.distributions[key];
        taskConfig[key] = {
          options: {
            patterns: [
              {
                match: 'api-endpoint',
                replacement: distributionConfig.apiEndpoint,
              },
              {
                match: 'live-reload-tag',
                replacement: distributionConfig.liveReload
                  ? '<script src="http://localhost:35729/livereload.js"></script>'
                  : '',
              },
            ],
          },
          src: 'src/client/index.template.html',
          dest: `dist/${key}/index.html`,
        };
      }
      return taskConfig;
    })(),
    less: (function() {
      const taskConfig = {
        options: {
          paths: sourcePath => [sourcePath, 'node_modules'],
        },
        exercises: {
          src: ['src/client/exercises/style.less'],
          dest: 'dist/exercises/style.css',
        },
      };
      for (const key in config.distributions) {
        taskConfig[key] = {
          options: {
            compress: !config.distributions[key].beautify,
          },
          src: ['src/client/style.less'],
          dest: `dist/${key}/style.css`,
        };
      }
      return taskConfig;
    })(),
    watch: {
      exercises: {
        files: 'src/exercises/**',
        tasks: 'build-exercises',
        options: {livereload: true},
      },
      local: {
        files: 'src/**',
        tasks: 'build-local',
        options: {livereload: true},
      },
    },
    exec: (function() {
      const taskConfig = {
        npm: {cmd: 'npm install', cwd: 'build/server'},
        localApi: {
          cmd:
            'sam local start-api --skip-pull-image -s ../../dist/local ' +
            '-t src/server/template.yaml',
        },
      };
      for (const key in config.distributions) {
        const distributionConfig = config.distributions[key];
        const bucket = distributionConfig.bucket;
        if (bucket) {
          taskConfig[`package-${key}`] = {
            cmd:
              'sam package --template-file src/server/template.yaml ' +
              `--output-template-file build/${key}.yaml --s3-bucket ${bucket}`,
          };
          taskConfig[`deploy-${key}`] = {
            cmd:
              `sam deploy --template-file build/${key}.yaml ` +
              `--stack-name ${bucket} --s3-bucket ${bucket} ` +
              `--capabilities CAPABILITY_IAM`,
          };
          taskConfig[`s3-${key}`] = {
            cmd:
              `aws s3 sync dist/${key} s3://${bucket} ` +
              '--acl public-read --delete',
          };
          taskConfig[`invalidate-${key}`] = {
            cmd:
              'aws cloudfront create-invalidation --distribution-id ' +
              `${distributionConfig.cloudfrontId} --paths '/*'`,
          };
        }
      }
      return taskConfig;
    })(),
    open: {
      local: {
        url: 'dist/local/index.html',
      },
    },
    migrate: (function() {
      const taskConfig = {};
      for (const key in config.distributions) {
        taskConfig[key] = {};
      }
      return taskConfig;
    })(),
    concurrent: {
      options: {logConcurrentOutput: true},
      local: ['watch:local', 'exec:localApi', 'open:local'],
    },
    rsync: {
      exercises: {
        options: {
          src: 'dist/exercises/',
          dest: '/usr/share/wordpress/phantasml/exercises',
          host: 'www.fungibleinsight.com',
          delete: true,
          recursive: true,
        },
      },
    },
  });

  // task to open an URL
  grunt.registerMultiTask('open', 'Opens the app URL.', function() {
    const done = this.async();
    setTimeout(() => {
      require('opn')(this.data.url);
      done(true);
    }, 1000);
  });

  // database migration task
  grunt.registerMultiTask('migrate', 'Migrate database.', async function() {
    const done = this.async();
    try {
      await require('./build/tools/migrate').default(config.firstAdminEmail);
      done(true);
    } catch (error) {
      done(error);
    }
  });

  // distribution tasks
  for (const key in config.distributions) {
    grunt.registerTask(`build-${key}`, `Builds the ${key} distribution.`, [
      'babel',
      `env:${key}`,
      `browserify:${key}`,
      'copy:app',
      `uglify:${key}`,
      `replace:${key}`,
      `less:${key}`,
    ]);
    if (config.distributions[key].bucket) {
      grunt.registerTask(
        `publish-${key}`,
        `Publishes the ${key} distribution.`,
        [
          `build-${key}`,
          `exec:npm`,
          `migrate:${key}`,
          `exec:package-${key}`,
          `exec:deploy-${key}`,
          `exec:s3-${key}`,
          `exec:invalidate-${key}`,
        ],
      );
    }
  }

  // exercise tasks
  grunt.registerTask('build-exercises', 'Builds the exercises.', [
    'babel',
    'browserify:exercises',
    'uglify:exercises',
    ...exerciseNames.map(name => `replace:${name}`),
    'less:exercises',
  ]);
  grunt.registerTask('publish-exercises', 'Publishes the exercises.', [
    'build-exercises',
    'rsync:exercises',
  ]);

  // builds local distribution and watches for changes
  grunt.registerTask(
    'start-local',
    'Builds the local distribution, starts it, and watches for changes.',
    ['build-local', 'exec:npm', 'migrate:local', 'concurrent:local'],
  );

  // Default task(s).
  grunt.registerTask('default', ['start-local']);
};
