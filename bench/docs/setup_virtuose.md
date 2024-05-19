1. 
    ```sh
    mkdir my_virtdb
    cd my_virtdb/
    ```
2.
    ```sh
    docker run --name my_virtdb --interactive --tty --env DBA_PASSWORD=1234 --publish 1111:1111 --publish  8890:8890 --volume `pwd`:/database openlink/virtuoso-opensource-7@sha256:e07868a3db9090400332eaa8ee694b8cf9bf7eebc26db6bbdc3bb92fd30ed010
    ```
3. go to http://localhost:8890/
4. go to conductor
5. log in with username: "dba" en psw: "1234"
6. go to the tab: Linked Data
7. go to the tab: Quad Store Upload
8. upload to data-source files (in Turtle, N-Triples, ... format)