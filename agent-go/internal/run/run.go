package run

import (
	"bufio"
	"bytes"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

// Result holds stdout, stderr and success of a command.
type Result struct {
	Success bool
	Stdout  string
	Stderr  string
	Error   string
}

func shellAndArgs(command string) (name string, args []string) {
	if runtime.GOOS == "windows" {
		return "cmd", []string{"/c", command}
	}
	return "sh", []string{"-c", command}
}

// Run runs a command in the shell and returns combined result.
func Run(command, cwd string) Result {
	name, args := shellAndArgs(command)
	cmd := exec.Command(name, args...)
	if cwd != "" {
		cmd.Dir = cwd
	}
	var out, errOut bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errOut
	err := cmd.Run()
	stdout := strings.TrimSpace(out.String())
	stderr := strings.TrimSpace(errOut.String())
	r := Result{
		Success: cmd.ProcessState != nil && cmd.ProcessState.Success(),
		Stdout:  stdout,
		Stderr:  stderr,
	}
	if err != nil {
		r.Error = err.Error()
	}
	return r
}

// FormatOutput returns a single string from result for logging.
func FormatOutput(r Result) string {
	var parts []string
	if r.Stdout != "" {
		parts = append(parts, r.Stdout)
	}
	if r.Stderr != "" {
		parts = append(parts, r.Stderr)
	}
	if r.Error != "" {
		parts = append(parts, "Error: "+r.Error)
	}
	s := strings.TrimSpace(strings.Join(parts, "\n"))
	if s == "" {
		return "(no output)"
	}
	return s
}

// RunStream runs a command and calls onLine for each line of stdout/stderr; returns on process exit.
func RunStream(command, cwd string, onLine func(string)) (success bool, exitCode *int) {
	name, args := shellAndArgs(command)
	cmd := exec.Command(name, args...)
	if cwd != "" {
		cmd.Dir = cwd
	}
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		onLine("Error: " + err.Error())
		return false, nil
	}
	emit := func(sc *bufio.Scanner) {
		for sc.Scan() {
			onLine(sc.Text())
		}
	}
	go emit(bufio.NewScanner(stdout))
	go emit(bufio.NewScanner(stderr))
	err := cmd.Wait()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			code := exitErr.ExitCode()
			exitCode = &code
		}
		return false, exitCode
	}
	zero := 0
	return true, &zero
}

// ExitCodeString returns a string for logging (e.g. "0" or "null").
func ExitCodeString(exitCode *int) string {
	if exitCode == nil {
		return "null"
	}
	return fmt.Sprintf("%d", *exitCode)
}
